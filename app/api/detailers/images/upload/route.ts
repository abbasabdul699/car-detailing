import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '../../../auth/[...nextauth]/route';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const detailer = await prisma.detailer.findUnique({
      where: { email: session.user.email }
    });

    if (!detailer) {
      return NextResponse.json({ error: 'Detailer not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Here you would typically:
    // 1. Upload the file to a storage service (e.g., AWS S3, Cloudinary)
    // 2. Get the URL of the uploaded file
    // For this example, we'll assume a mock URL
    const imageUrl = `/images/detailers/${file.name}`;

    const newImage = await prisma.image.create({
      data: {
        url: imageUrl,
        alt: file.name,
        detailerId: detailer.id,
        isFeatured: false
      }
    });

    return NextResponse.json(newImage);
  } catch (error) {
    console.error('Image upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    );
  }
} 