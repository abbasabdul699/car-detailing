import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const detailer = await prisma.detailer.findUnique({
      where: {
        id: params.id
      }
    });

    if (!detailer) {
      return NextResponse.json(
        { error: 'Detailer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(detailer);
  } catch (error) {
    console.error('Error fetching detailer:', error);
    return NextResponse.json(
      { error: 'Failed to fetch detailer' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const data = await request.json();
    const updatedDetailer = await prisma.detailer.update({
      where: { id: params.id },
      data: data,
    });

    return Response.json(updatedDetailer);
  } catch (error) {
    return Response.json(
      { error: 'Failed to update detailer' },
      { status: 500 }
    );
  }
} 