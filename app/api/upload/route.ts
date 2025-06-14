// app/api/upload/route.ts
import { NextResponse } from 'next/server';
import { uploadImage, ImageCategory } from '@/lib/s3-utils';
import { prisma } from '@/lib/prisma';
import { ObjectId } from 'mongodb';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const detailerId = formData.get('detailerId') as string;
    const type = formData.get('type') as string || 'portfolio';
    const businessName = formData.get('businessName') as string || 'detailer';
    
    // Validate required fields
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!detailerId) {
      return NextResponse.json(
        { error: 'Detailer ID is required' },
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

    // Validate detailerId as ObjectId
    let objectId: string;
    try {
      objectId = new ObjectId(detailerId).toHexString();
    } catch (e) {
      return NextResponse.json({ error: 'Invalid detailerId format' }, { status: 400 });
    }

    // Upload to S3
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `${businessName.replace(/\s+/g, '-')}-${Date.now()}.jpg`;
    const imageUrl = await uploadImage(buffer, 'detailers', fileName);

    // Save to database
    const image = await prisma.image.create({
      data: {
        url: imageUrl,
        alt: `${businessName} ${type} image`,
        detailerId: objectId,
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