import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get portfolio images for the logged-in detailer
    const images = await prisma.detailerImage.findMany({
      where: { 
        detailerId: session.user.id
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        url: true,
        createdAt: true,
      }
    });

    return NextResponse.json(images);
  } catch (error) {
    console.error('Error fetching portfolio images:', error);
    return NextResponse.json({ error: 'Failed to fetch images' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { url } = await request.json();
    
    if (!url) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
    }

    // Create new portfolio image
    const image = await prisma.detailerImage.create({
      data: {
        detailerId: session.user.id,
        url,
        key: url.split('/').pop() || 'portfolio-image', // Extract filename from URL
        alt: 'Portfolio image',
      },
      select: {
        id: true,
        url: true,
        createdAt: true,
      }
    });

    return NextResponse.json(image);
  } catch (error) {
    console.error('Error creating portfolio image:', error);
    return NextResponse.json({ error: 'Failed to add image' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await request.json();
    
    if (!id) {
      return NextResponse.json({ error: 'Image ID is required' }, { status: 400 });
    }

    // Delete the portfolio image
    await prisma.detailerImage.delete({
      where: { 
        id,
        detailerId: session.user.id // Ensure user can only delete their own images
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting portfolio image:', error);
    return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 });
  }
}
