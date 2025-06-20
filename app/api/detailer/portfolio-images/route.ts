import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
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
  const images = await prisma.image.findMany({
    where: { detailerId: detailer.id, type: 'portfolio' }
  });
  return NextResponse.json(images);
}

export async function POST(request: Request) {
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
  const { url } = await request.json();
  if (!url) {
    return NextResponse.json({ error: 'Image URL required' }, { status: 400 });
  }
  const image = await prisma.portfolioImage.create({
    data: {
      detailerId: detailer.id,
      url,
    }
  });
  return NextResponse.json(image, { status: 201 });
}

export async function DELETE(request: Request) {
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
  const { id } = await request.json();
  if (!id) {
    return NextResponse.json({ error: 'Image ID required' }, { status: 400 });
  }
  await prisma.image.delete({
    where: { id }
  });
  return NextResponse.json({ success: true });
}
