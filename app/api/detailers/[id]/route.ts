import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'No ID provided' },
        { status: 400 }
      );
    }

    const detailer = await prisma.detailer.findUnique({
      where: {
        id: id
      },
      select: {
        id: true,
        businessName: true,
        email: true,
        phone: true,
        address: true,
        latitude: true,
        longitude: true,
        priceRange: true,
        description: true,
        services: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true
          }
        },
        images: {
          select: {
            id: true,
            url: true,
            alt: true,
            isFeatured: true
          }
        }
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
    console.error('API Route - Error:', error);
    
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
    const updatedDetailer = await prisma.detailer.update({
      where: { id: params.id },
      data: data,
    });

    return Response.json(updatedDetailer);
  } catch (error) {
    return Response.json(
      { error: 'Failed to update detailer' },
      { status: 500 }
    );
  }
} 