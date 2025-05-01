// app/api/upload/route.ts
import { NextResponse } from 'next/server';
import { uploadImage, ImageCategory } from '@/lib/s3-utils';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const businessName = formData.get('businessName') as string;
    const detailerId = formData.get('detailerId') as string;
    
    if (!file || !businessName || !detailerId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `${businessName}-${Date.now()}.jpg`;
    const imageUrl = await uploadImage(buffer, 'detailers', fileName);

    // Save to database
    const image = await prisma.detailerImage.create({
      data: {
        url: imageUrl,
        key: `detailers/${fileName}`,
        alt: `${businessName} detailing service`,
        detailerId: detailerId
      }
    });

    return NextResponse.json({ success: true, image });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Error uploading image' },
      { status: 500 }
    );
  }
}