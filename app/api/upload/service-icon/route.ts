import { NextResponse } from 'next/server';
import { uploadImage } from '@/lib/s3-utils';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const serviceId = formData.get('serviceId') as string | null;
    const name = formData.get('name') as string | null;
    const description = formData.get('description') as string | null;
    console.log('Received file:', file.name, 'type:', file.type, 'size:', file.size);
    // Validate required fields
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    // Validate file type
    if (file.type !== 'image/svg+xml') {
      return NextResponse.json(
        { error: 'File must be an SVG image' },
        { status: 400 }
      );
    }
    // Validate file size (1MB limit for SVGs)
    if (file.size > 1 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 1MB' },
        { status: 400 }
      );
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `service-icon-${Date.now()}.svg`;
    console.log('Uploading to S3 with fileName:', fileName);
    let imageUrl = null;
    try {
      imageUrl = await uploadImage(buffer, 'icon', fileName);
      console.log('S3 returned imageUrl:', imageUrl);
    } catch (uploadError) {
      console.error('S3 upload failed:', uploadError);
      return NextResponse.json(
        { error: uploadError instanceof Error ? uploadError.message : 'S3 upload failed' },
        { status: 500 }
      );
    }
    if (!imageUrl) {
      console.error('No image URL returned from S3 upload');
      return NextResponse.json(
        { error: 'No image URL returned from S3 upload' },
        { status: 500 }
      );
    }

    // Optionally update the Service record if serviceId is provided
    let service = null;
    if (serviceId) {
      service = await prisma.service.update({
        where: { id: serviceId },
        data: {
          icon: imageUrl,
        },
      });
    }

    return NextResponse.json({ success: true, imageUrl, service });
  } catch (error) {
    console.error('Service icon upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error uploading service icon' },
      { status: 500 }
    );
  }
} 