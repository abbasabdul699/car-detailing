// app/api/upload/route.ts
import { NextResponse } from 'next/server';
import { uploadImage, ImageCategory } from '@/lib/s3-utils';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string || 'portfolio';
    const businessName = formData.get('businessName') as string || 'detailer';
    
    // Validate required fields
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      );
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      );
    }

    // Get detailerId from session
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const detailer = await prisma.detailer.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });
    if (!detailer) {
      return NextResponse.json({ error: 'Detailer not found' }, { status: 404 });
    }
    const detailerId = detailer.id;

    // Upload to S3
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `${businessName.replace(/\s+/g, '-')}-${Date.now()}.jpg`;
    const imageUrl = await uploadImage(buffer, 'detailers', fileName);

    // Save to database
    const image = await prisma.image.create({
      data: {
        url: imageUrl,
        alt: `${businessName} ${type} image`,
        detailerId: detailerId,
        type: type
      }
    });

    // If this is a profile image, update the detailer's imageUrl
    if (type === 'profile') {
      await prisma.detailer.update({
        where: { id: detailerId },
        data: { imageUrl }
      });
    }

    return NextResponse.json({ success: true, image });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error uploading image' },
      { status: 500 }
    );
  }
}