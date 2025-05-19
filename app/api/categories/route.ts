import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/prisma';

const prismaClient = new PrismaClient();

export async function GET() {
  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
  return NextResponse.json(categories);
}

export async function POST(request: Request) {
  try {
    const { name, description, icon } = await request.json();
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }
    // Check if category already exists
    const existing = await prismaClient.category.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json({ error: 'Category already exists' }, { status: 409 });
    }
    const newCategory = await prismaClient.category.create({
      data: {
        name,
        description: description || '',
        icon: icon || '',
      },
    });
    return NextResponse.json(newCategory, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add category' }, { status: 500 });
  }
} 