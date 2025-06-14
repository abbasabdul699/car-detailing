import { NextResponse } from 'next/server';
import { uploadImage } from '@/lib/s3-utils';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const bookingId = formData.get('bookingId') as string;

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    if (!bookingId) return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
    if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `booking-${bookingId}-${Date.now()}.jpg`;
    const imageUrl = await uploadImage(buffer, 'bookings', fileName);

    const image = await prisma.bookingImage.create({
      data: {
        url: imageUrl,
        alt: `Booking ${bookingId} image`,
        bookingId,
      }
    });

    return NextResponse.json({ success: true, image });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error uploading image' }, { status: 500 });
  }
}
