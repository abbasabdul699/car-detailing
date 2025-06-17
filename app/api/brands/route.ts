import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const brands = await prisma.brand.findMany({
    select: { name: true, logo: true },
    orderBy: { name: 'asc' }
  });
  return NextResponse.json(brands);
}
