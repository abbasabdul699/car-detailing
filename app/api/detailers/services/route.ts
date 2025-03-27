import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    console.log('Session:', session); // Debug log
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const data = await request.json();
    console.log('Received service data:', data);
    
    // Validate the service data
    if (!data.name || !data.price) {
      return NextResponse.json(
        { error: 'Service name and price are required' },
        { status: 400 }
      );
    }

    // Get the detailer
    const detailer = await prisma.detailer.findUnique({
      where: { email: session.user.email }
    });
    console.log('Found detailer:', detailer); // Debug log

    if (!detailer) {
      return NextResponse.json({ error: 'Detailer not found' }, { status: 404 });
    }

    // Create the service
    const service = await prisma.service.create({
      data: {
        name: data.name,
        description: data.description || '',
        price: parseFloat(data.price),
        duration: data.duration?.toString() || '',
        detailerId: detailer.id
      }
    });

    return NextResponse.json(service, { status: 201 });
  } catch (error) {
    console.error('Failed to add service:', error);
    return NextResponse.json(
      { error: 'Failed to add service' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get the detailer
    const detailer = await prisma.detailer.findUnique({
      where: { email: session.user.email },
      include: {
        services: true // Include the services relation
      }
    });

    if (!detailer) {
      return NextResponse.json({ error: 'Detailer not found' }, { status: 404 });
    }

    return NextResponse.json(detailer.services);
  } catch (error) {
    console.error('Failed to fetch services:', error);
    return NextResponse.json(
      { error: 'Failed to fetch services' },
      { status: 500 }
    );
  }
} 