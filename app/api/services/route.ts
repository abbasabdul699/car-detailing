import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const services = await prisma.service.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        icon: true,
        categoryId: true,
        basePrice: true,
        priceRange: true,
        duration: true,
      },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(services);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, description, icon, categoryId, basePrice, priceRange, duration } = await request.json();
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Service name is required' }, { status: 400 });
    }
    // Check if service already exists
    const existing = await prisma.service.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json({ error: 'Service already exists' }, { status: 409 });
    }
    const newService = await prisma.service.create({
      data: {
        name,
        description: description || '',
        icon: icon || '',
        categoryId: categoryId || null,
        basePrice: basePrice ? parseFloat(basePrice) : null,
        priceRange: priceRange || null,
        duration: duration ? parseInt(duration) : null,
      },
    });
    return NextResponse.json(newService, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add service' }, { status: 500 });
  }
} 
