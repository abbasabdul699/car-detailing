import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { deleteImageFromS3 } from '@/lib/s3-utils';

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'Missing image URL' }, { status: 400 });
  }

  try {
    // Delete from S3 if it's an S3 URL
    if (url.includes('amazonaws.com/')) {
      const key = url.split('.amazonaws.com/')[1];
      if (key) {
        try {
          await deleteImageFromS3(key);
        } catch (err) {
          // Log but don't fail the whole operation
          console.error('Failed to delete image from S3:', key, err);
        }
      }
    }
    // Delete from Image table only
    await prisma.image.deleteMany({ where: { url } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting image:', error);
    return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 });
  }
} 