import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { name, description, icon, categoryId, basePrice, priceRange, duration } = await request.json();
    
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Service name is required' }, { status: 400 });
    }

    // Check if service exists
    const existing = await prisma.service.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    // Check if name is being changed and if new name already exists
    if (name !== existing.name) {
      const nameExists = await prisma.service.findUnique({ where: { name } });
      if (nameExists) {
        return NextResponse.json({ error: 'Service name already exists' }, { status: 409 });
      }
    }

    const updatedService = await prisma.service.update({
      where: { id },
      data: {
        name,
        description: description || '',
        icon: icon || '',
        categoryId: categoryId || null,
        basePrice: basePrice ? parseFloat(basePrice) : null,
        priceRange: priceRange || null,
        duration: duration ? parseInt(duration) : null,
      },
    });

    return NextResponse.json(updatedService);
  } catch (error) {
    console.error('Error updating service:', error);
    return NextResponse.json({ error: 'Failed to update service' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Check if service exists
    const existing = await prisma.service.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    // Check if service is being used by any detailers
    const detailerServices = await prisma.detailerService.findMany({
      where: { serviceId: id }
    });

    if (detailerServices.length > 0) {
      return NextResponse.json({ 
        error: `Cannot delete service. It is being used by ${detailerServices.length} detailer(s).` 
      }, { status: 409 });
    }

    await prisma.service.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Service deleted successfully' });
  } catch (error) {
    console.error('Error deleting service:', error);
    return NextResponse.json({ error: 'Failed to delete service' }, { status: 500 });
  }
}