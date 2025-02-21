import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    console.log('API Route - Fetching detailer with ID:', params.id);

    if (!params.id) {
      return NextResponse.json(
        { error: 'No ID provided' },
        { status: 400 }
      );
    }

    const detailerId = params.id;

    const detailer = await prisma.detailer.findUnique({
      where: {
        id: detailerId
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
    
  } catch (error: any) {
    console.error('API Route - Detailed error:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      params: params
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch detailer',
        details: error.message,
        type: error.name 
      },
      { status: 500 }
    );
  }
} 