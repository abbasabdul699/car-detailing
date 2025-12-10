import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET: Fetch all resources for the logged-in detailer
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const detailerId = session.user.id;

    // Verify the detailer exists
    const detailer = await prisma.detailer.findUnique({
      where: { id: detailerId },
      select: { id: true }
    });

    if (!detailer) {
      return NextResponse.json({ error: 'Detailer not found' }, { status: 404 });
    }

    // Fetch all resources for this detailer
    const resources = await prisma.resource.findMany({
      where: { detailerId },
      orderBy: [
        { type: 'asc' }, // Bays first, then vans
        { name: 'asc' }  // Then alphabetically by name
      ]
    });

    return NextResponse.json({ resources });
  } catch (error) {
    console.error('Error fetching resources:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Create a new resource
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const detailerId = session.user.id;
    const body = await request.json();
    const { name, type } = body;

    // Validation
    if (!name || !type) {
      return NextResponse.json(
        { error: 'Name and type are required' },
        { status: 400 }
      );
    }

    if (type !== 'bay' && type !== 'van') {
      return NextResponse.json(
        { error: 'Type must be either "bay" or "van"' },
        { status: 400 }
      );
    }

    // Verify the detailer exists
    const detailer = await prisma.detailer.findUnique({
      where: { id: detailerId },
      select: { id: true }
    });

    if (!detailer) {
      return NextResponse.json({ error: 'Detailer not found' }, { status: 404 });
    }

    // Check if a resource with the same name already exists for this detailer
    const existingResource = await prisma.resource.findUnique({
      where: {
        detailerId_name: {
          detailerId,
          name: name.trim()
        }
      }
    });

    if (existingResource) {
      return NextResponse.json(
        { error: 'A resource with this name already exists' },
        { status: 409 }
      );
    }

    // Create the resource
    const resource = await prisma.resource.create({
      data: {
        detailerId,
        name: name.trim(),
        type: type.toLowerCase()
      }
    });

    return NextResponse.json({
      success: true,
      resource
    });
  } catch (error: any) {
    console.error('Error creating resource:', error);
    
    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A resource with this name already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

