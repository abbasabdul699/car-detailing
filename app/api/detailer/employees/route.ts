import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET: Fetch all employees for the logged-in detailer
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

    // Fetch all employees for this detailer
    const employees = await prisma.employee.findMany({
      where: { detailerId },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({ employees });
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Create a new employee
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const detailerId = session.user.id;
    const body = await request.json();
    const { name, email, phone, imageUrl, workHours, isActive, color } = body;

    // Validation
    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
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

    // Check if an employee with the same name already exists for this detailer
    const existingEmployee = await prisma.employee.findUnique({
      where: {
        detailerId_name: {
          detailerId,
          name: name.trim()
        }
      }
    });

    if (existingEmployee) {
      return NextResponse.json(
        { error: 'An employee with this name already exists' },
        { status: 409 }
      );
    }

    // Create the employee
    const employee = await prisma.employee.create({
      data: {
        detailerId,
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        imageUrl: imageUrl?.trim() || null,
        workHours: workHours || null,
        isActive: isActive !== undefined ? isActive : true,
        color: color || 'blue'
      }
    });

    return NextResponse.json({
      success: true,
      employee
    });
  } catch (error: any) {
    console.error('Error creating employee:', error);
    
    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'An employee with this name already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


