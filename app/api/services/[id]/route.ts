import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { deleteImageFromS3 } from '@/lib/s3-utils';

const prisma = new PrismaClient();

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  try {
    // Fetch the service to get the icon URL
    const service = await prisma.service.findUnique({ where: { id } });
    let iconKey = null;
    if (service?.icon) {
      // Parse the S3 key from the icon URL
      const match = service.icon.match(/amazonaws\.com\/(.+)$/);
      if (match && match[1]) {
        iconKey = match[1];
        try {
          await deleteImageFromS3(iconKey);
        } catch (s3err) {
          console.error('Failed to delete icon from S3:', s3err);
        }
      }
    }
    // Delete all DetailerService records referencing this service
    await prisma.detailerService.deleteMany({ where: { serviceId: id } });
    // Delete the service itself
    await prisma.service.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete service error:', error);
    const message = (error instanceof Error) ? error.message : 'Failed to delete service';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  try {
    const { name, description, icon, categoryId } = await request.json();
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (icon !== undefined) updateData.icon = icon;
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    const updated = await prisma.service.update({
      where: { id },
      data: updateData,
    });
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update service' }, { status: 500 });
  }
} 