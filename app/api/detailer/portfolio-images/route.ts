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

    // Get portfolio images from both Image and DetailerImage tables
    const [detailerImages, regularImages] = await Promise.all([
      prisma.detailerImage.findMany({
        where: { 
          detailerId: session.user.id
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          url: true,
          createdAt: true,
        }
      }),
      prisma.image.findMany({
        where: { 
          detailerId: session.user.id,
          type: 'portfolio'
        },
        select: {
          id: true,
          url: true,
          createdAt: true,
        }
      })
    ]);

    // Combine and deduplicate images
    const allImages = [...detailerImages, ...regularImages];
    const uniqueImages = allImages.filter((img, index, self) => 
      index === self.findIndex(i => i.url === img.url)
    );

    // Sort by creation date
    const images = uniqueImages.sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );

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

    // Create new portfolio image in the Image table (same as upload API)
    const image = await prisma.image.create({
      data: {
        detailerId: session.user.id,
        url,
        alt: 'Portfolio image',
        type: 'portfolio',
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

    // Delete the portfolio image from both tables
    await Promise.all([
      prisma.detailerImage.deleteMany({
        where: { 
          id,
          detailerId: session.user.id
        }
      }),
      prisma.image.deleteMany({
        where: { 
          id,
          detailerId: session.user.id,
          type: 'portfolio'
        }
      })
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting portfolio image:', error);
    return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 });
  }
}
