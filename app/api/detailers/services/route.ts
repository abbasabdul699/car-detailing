import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const services = await prisma.service.findMany({
      select: { name: true, category: { select: { name: true } } },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json({ services });
  } catch (error) {
    return NextResponse.json({ services: [] }, { status: 500 });
  }
} 