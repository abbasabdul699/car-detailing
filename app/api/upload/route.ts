// app/api/upload/route.ts
import { NextResponse } from 'next/server';
import { uploadImage, type ImageCategory } from '@/lib/s3-utils';
import { prisma } from '@/lib/prisma';
import { ObjectId } from 'mongodb';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// Route segment config - note: Vercel has a hard 4.5MB limit that cannot be overridden
export const runtime = 'nodejs';
export const maxDuration = 30;

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
    if (!file || !businessName || !type) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    // Use session user ID if detailerId not provided
    const finalDetailerId = detailerId || session.user.id;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      );
    }

    // Validate file size (4MB limit to stay under Vercel's 4.5MB limit)
    const maxFileSize = 4 * 1024 * 1024; // 4MB
    if (file.size > maxFileSize) {
      return NextResponse.json(
        { error: 'File size must be less than 4MB. Please compress your image or use a smaller file.' },
        { status: 400 }
      );
    }

    // Convert detailerId to ObjectId
    let objectId;
    try {
      objectId = new ObjectId(finalDetailerId);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid detailerId format' }, { status: 400 });
    }

    const detailer = await prisma.detailer.findUnique({
      where: { id: objectId.toString() },
      select: { id: true }
    });

    if (!detailer) {
      return NextResponse.json({ error: 'Detailer not found' }, { status: 404 });
    }

    // Upload to S3
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `${businessName}-${Date.now()}-${Math.random().toString(36).substring(2)}.jpg`;
    const imageUrl = await uploadImage(buffer, 'detailers', fileName);

    // Save to database
    const image = await prisma.image.create({
      data: {
        url: imageUrl,
        alt: `${businessName} ${type} image`,
        detailerId: objectId.toString(),
        type: type
      }
    });

    // If it's a profile image, update the detailer's imageUrl
    if (type === 'profile') {
      await prisma.detailer.update({
        where: { id: objectId.toString() },
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