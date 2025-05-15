import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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