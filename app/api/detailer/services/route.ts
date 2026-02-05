import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { detailerAuthOptions } from "@/app/api/auth-detailer/[...nextauth]/route";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET: Fetch all services for the logged-in detailer
export async function GET() {
  const session = await getServerSession(detailerAuthOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Find the detailer by id
  const detailer = await prisma.detailer.findUnique({
    where: { id: session.user.id },
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
    include: {
      category: true,
    },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(services);
}

// POST: Add a service for the logged-in detailer
export async function POST(request: Request) {
  const session = await getServerSession(detailerAuthOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const data = await request.json();
  // Find the detailer by id
  const detailer = await prisma.detailer.findUnique({
    where: { id: session.user.id },
    select: { id: true }
  });
  if (!detailer) {
    return NextResponse.json({ error: 'Detailer not found' }, { status: 404 });
  }
  try {
    const existing = await prisma.detailerService.findUnique({
      where: {
        detailerId_serviceId: {
          detailerId: detailer.id,
          serviceId: data.serviceId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(existing, { status: 200 });
    }

    const detailerService = await prisma.detailerService.create({
      data: {
        detailerId: detailer.id,
        serviceId: data.serviceId,
      },
    });

    return NextResponse.json(detailerService, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to add service', details: (e as Error).message }, { status: 500 });
  }
}

// DELETE: Remove a service for the logged-in detailer
export async function DELETE(request: Request) {
  const session = await getServerSession(detailerAuthOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { serviceId } = await request.json();
  // Find the detailer by id
  const detailer = await prisma.detailer.findUnique({
    where: { id: session.user.id },
    select: { id: true }
  });
  if (!detailer) {
    return NextResponse.json({ error: 'Detailer not found' }, { status: 404 });
  }
  try {
    const result = await prisma.detailerService.deleteMany({
      where: {
        detailerId: detailer.id,
        serviceId,
      },
    });
    return NextResponse.json({ success: true, deletedCount: result.count });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to remove service', details: (e as Error).message }, { status: 500 });
  }
}
