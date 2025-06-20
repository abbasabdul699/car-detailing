import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET: Fetch all services for the logged-in detailer
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Find the detailer by email
  const detailer = await prisma.detailer.findUnique({
    where: { email: session.user.email },
    select: { id: true }
  });
  if (!detailer) {
    return NextResponse.json({ error: 'Detailer not found' }, { status: 404 });
  }

  // 1. Find all serviceIds for this detailer
  const detailerServices = await prisma.detailerService.findMany({
    where: { detailerId: detailer.id },
    select: { serviceId: true }
  });
  const serviceIds = detailerServices.map(ds => ds.serviceId);

  // 2. Fetch all services with those IDs
  const services = await prisma.service.findMany({
    where: { id: { in: serviceIds } },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(services);
}

// POST: Add a service for the logged-in detailer
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const data = await request.json();
  // Find the detailer by email
  const detailer = await prisma.detailer.findUnique({
    where: { email: session.user.email },
    select: { id: true }
  });
  if (!detailer) {
    return NextResponse.json({ error: 'Detailer not found' }, { status: 404 });
  }
  try {
    // Create or update the DetailerService entry
    const detailerService = await prisma.detailerService.upsert({
      where: {
        detailerId_serviceId: {
          detailerId: detailer.id,
          serviceId: data.serviceId,
        },
      },
      update: {
        price: data.price,
      },
      create: {
        detailerId: detailer.id,
        serviceId: data.serviceId,
        price: data.price,
      },
    });
    return NextResponse.json(detailerService, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to add service', details: (e as Error).message }, { status: 500 });
  }
}

// DELETE: Remove a service for the logged-in detailer
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { serviceId } = await request.json();
  // Find the detailer by email
  const detailer = await prisma.detailer.findUnique({
    where: { email: session.user.email },
    select: { id: true }
  });
  if (!detailer) {
    return NextResponse.json({ error: 'Detailer not found' }, { status: 404 });
  }
  try {
    await prisma.detailerService.delete({
      where: {
        detailerId_serviceId: {
          detailerId: detailer.id,
          serviceId,
        },
      },
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to remove service', details: (e as Error).message }, { status: 500 });
  }
}

const images = await prisma.image.findMany({
  where: { detailerId: detailer.id, type: 'portfolio' },
}); 