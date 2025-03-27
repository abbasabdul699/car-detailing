import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const detailer = await prisma.detailer.findUnique({
      where: { email: session.user.email },
      include: { businessHours: true }
    });

    if (!detailer) {
      return NextResponse.json({ error: 'Detailer not found' }, { status: 404 });
    }

    return NextResponse.json(detailer.businessHours);
  } catch (error) {
    console.error('Hours fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch hours' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const detailer = await prisma.detailer.findUnique({
      where: { email: session.user.email }
    });

    if (!detailer) {
      return NextResponse.json({ error: 'Detailer not found' }, { status: 404 });
    }

    const hours = await request.json();

    // Delete existing hours
    await prisma.businessHours.deleteMany({
      where: { detailerId: detailer.id }
    });

    // Create new hours
    const savedHours = await Promise.all(
      hours.map((hour: any) =>
        prisma.businessHours.create({
          data: {
            day: hour.day,
            openTime: hour.openTime,
            closeTime: hour.closeTime,
            isClosed: hour.isClosed,
            detailerId: detailer.id
          }
        })
      )
    );

    return NextResponse.json(savedHours);
  } catch (error) {
    console.error('Hours save error:', error);
    return NextResponse.json({ error: 'Failed to save hours' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { hours } = await request.json();

    const detailer = await prisma.detailer.findUnique({
      where: { email: session.user.email }
    });

    if (!detailer) {
      return NextResponse.json({ error: 'Detailer not found' }, { status: 404 });
    }

    // Delete existing hours
    await prisma.businessHours.deleteMany({
      where: { detailerId: detailer.id }
    });

    // Create new hours
    const updatedHours = await Promise.all(
      hours.map((hour: any) =>
        prisma.businessHours.create({
          data: {
            day: hour.day,
            isOpen: hour.isOpen,
            openTime: hour.openTime,
            closeTime: hour.closeTime,
            detailerId: detailer.id
          }
        })
      )
    );

    return NextResponse.json(updatedHours);
  } catch (error) {
    console.error('Hours update error:', error);
    return NextResponse.json(
      { error: 'Failed to update business hours' },
      { status: 500 }
    );
  }
} 