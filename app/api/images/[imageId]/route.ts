import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(request: Request, { params }: { params: { imageId: string } }) {
  try {
    await prisma.image.delete({ where: { id: params.imageId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 });
  }
} 