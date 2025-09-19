// app/api/upload/route.ts
import { NextResponse } from 'next/server';
import { uploadImage, ImageCategory } from '@/lib/s3-utils';
import { prisma } from '@/lib/prisma';
import { ObjectId } from 'mongodb';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const businessName = formData.get('businessName') as string;
    const detailerId = formData.get('detailerId') as string;
    const type = formData.get('type') as 'profile' | 'portfolio' | 'bundle';
    
    // Validate required fields
    if (!file || !businessName || !detailerId || !type) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
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

    // Convert detailerId to ObjectId
    let objectId;
    try {
      objectId = new ObjectId(detailerId);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid detailerId format' }, { status: 400 });
    }

    const detailer = await prisma.detailer.findUnique({
      where: { id: session.user.id },
      select: { id: true }
    });

    if (!detailer) {
      return NextResponse.json({ error: 'Detailer not found' }, { status: 404 });
    }

    // Upload to S3
    const buffer = Buffer.from(await file.arrayBuffer());
    const imageUrl = await uploadImage(buffer, businessName, ImageCategory.DETAILER);

    // Save to database
    const image = await prisma.image.create({
      data: {
        url: imageUrl,
        alt: `${businessName} ${type} image`,
        detailerId: detailer.id,
        type: type
      }
    });

    // If it's a profile image, update the detailer's imageUrl
    if (type === 'profile') {
      await prisma.detailer.update({
        where: { id: detailer.id },
        data: { imageUrl: imageUrl }
      });
    }

    return NextResponse.json({ image });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    );
  }
}