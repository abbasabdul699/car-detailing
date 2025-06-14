import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const brandName = searchParams.get('brand');

  if (!brandName) {
    return NextResponse.json({ error: 'Brand name is required' }, { status: 400 });
  }

  const brand = await prisma.brand.findFirst({
    where: { name: brandName },
    select: { models: true },
  });

  if (!brand) {
    return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
  }

  return NextResponse.json(brand.models || []);
}
