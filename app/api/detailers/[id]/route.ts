import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log('API Route - Fetching detailer with ID:', params.id);

    if (!params.id) {
      console.error('API Route - No ID provided');
      return NextResponse.json(
        { error: 'No ID provided' },
        { status: 400 }
      );
    }

    const detailer = await prisma.detailer.findUnique({
      where: {
        id: parseInt(params.id)
      },
      include: {
        services: {
          select: {
            name: true,
            description: true,
            price: true
          }
        },
        images: {
          select: {
            url: true,
            alt: true
          }
        },
        beforeAfterImages: true,
      }
    });

    console.log('API Route - Database response:', detailer);

    if (!detailer) {
      console.log('API Route - No detailer found with ID:', params.id);
      return NextResponse.json(
        { error: 'Detailer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(detailer);
  } catch (error) {
    console.error('API Route - Error details:', {
      message: error.message,
      stack: error.stack,
      params: params
    });
    
    return NextResponse.json(
      { error: 'Failed to fetch detailer', details: error.message },
      { status: 500 }
    );
  }
} 