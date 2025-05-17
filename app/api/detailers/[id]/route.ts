import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { deleteImageFromS3 } from '@/lib/s3-utils';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const detailer = await prisma.detailer.findUnique({
      where: {
        id: params.id
      },
      include: {
        images: true,
        detailerImages: true,
        services: { include: { service: true } }
      }
    });

    if (!detailer) {
      return NextResponse.json(
        { error: 'Detailer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(detailer);
  } catch (error) {
    console.error('Error fetching detailer:', error);
    return NextResponse.json(
      { error: 'Failed to fetch detailer' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();
    // Only allow updatable scalar fields
    const allowedFields = [
      'businessName', 'email', 'phone', 'address', 'city', 'state', 'zipCode',
      'description', 'latitude', 'longitude', 'priceRange', 'website', 'businessHours', 'imageUrl', 'verified'
    ];
    const updateData: Record<string, any> = {};
    for (const key of allowedFields) {
      if (key in data) updateData[key] = data[key];
    }
    // Coerce latitude and longitude to numbers if present
    if (typeof updateData.latitude === 'string') {
      updateData.latitude = parseFloat(updateData.latitude);
    }
    if (typeof updateData.longitude === 'string') {
      updateData.longitude = parseFloat(updateData.longitude);
    }

    // --- NEW CODE: Update services ---
    if (Array.isArray(data.services)) {
      // 1. Remove all existing services for this detailer
      await prisma.detailerService.deleteMany({
        where: { detailerId: params.id }
      });

      // 2. Find all service records matching the provided names
      const serviceRecords = await prisma.service.findMany({
        where: { name: { in: data.services } }
      });

      // 3. Add new services
      await prisma.$transaction(
        serviceRecords.map(service =>
          prisma.detailerService.create({
            data: {
              detailerId: params.id,
              serviceId: service.id
            }
          })
        )
      );
    }
    // --- END NEW CODE ---

    const updatedDetailer = await prisma.detailer.update({
      where: { id: params.id },
      data: updateData,
    });
    return Response.json(updatedDetailer);
  } catch (error) {
    return Response.json(
      { error: 'Failed to update detailer' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const data = await request.json();
    const { imageUrl } = data;
    if (!imageUrl) {
      return NextResponse.json({ error: 'Image URL required' }, { status: 400 });
    }
    // Find the image in the DB
    const image = await prisma.image.findFirst({
      where: {
        detailerId: params.id,
        url: imageUrl,
      },
    });
    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }
    // Extract key from URL
    const urlParts = image.url.split('.amazonaws.com/');
    const key = urlParts[1];
    if (!key) {
      return NextResponse.json({ error: 'Image key not found' }, { status: 400 });
    }
    await deleteImageFromS3(key);
    // Remove from DB
    await prisma.image.delete({ where: { id: image.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting image:', error);
    return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 });
  }
} 