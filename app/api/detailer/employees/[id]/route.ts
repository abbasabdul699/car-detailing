import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET: Fetch a single employee by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const detailerId = session.user.id;
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
    }

    // Fetch the employee and verify it belongs to this detailer
    const employee = await prisma.employee.findFirst({
      where: {
        id,
        detailerId
      }
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    return NextResponse.json({ employee });
  } catch (error) {
    console.error('Error fetching employee:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH: Update an employee
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const detailerId = session.user.id;
    const { id } = await params;
    const body = await request.json();
    const { name, email, phone, imageUrl, workHours, isActive, color } = body;

    if (!id) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
    }

    // Verify the employee exists and belongs to this detailer
    const existingEmployee = await prisma.employee.findFirst({
      where: {
        id,
        detailerId
      }
    });

    if (!existingEmployee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Build update data
    const updateData: { 
      name?: string; 
      email?: string | null; 
      phone?: string | null; 
      imageUrl?: string | null; 
      workHours?: any; 
      isActive?: boolean;
      color?: string;
    } = {};
    
    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json(
          { error: 'Name cannot be empty' },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    if (email !== undefined) {
      updateData.email = email?.trim() || null;
    }

    if (phone !== undefined) {
      updateData.phone = phone?.trim() || null;
    }

    if (imageUrl !== undefined) {
      updateData.imageUrl = imageUrl?.trim() || null;
    }

    if (workHours !== undefined) {
      updateData.workHours = workHours;
    }

    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    if (color !== undefined) {
      updateData.color = color;
    }

    // If name is being changed, check for duplicates
    if (updateData.name && updateData.name !== existingEmployee.name) {
      const duplicateEmployee = await prisma.employee.findUnique({
        where: {
          detailerId_name: {
            detailerId,
            name: updateData.name
          }
        }
      });

      if (duplicateEmployee && duplicateEmployee.id !== id) {
        return NextResponse.json(
          { error: 'An employee with this name already exists' },
          { status: 409 }
        );
      }
    }

    // Update the employee
    const updatedEmployee = await prisma.employee.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({
      success: true,
      employee: updatedEmployee
    });
  } catch (error: any) {
    console.error('Error updating employee:', error);
    
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

// DELETE: Delete an employee
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const detailerId = session.user.id;
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 });
    }

    // Verify the employee exists and belongs to this detailer
    const employee = await prisma.employee.findFirst({
      where: {
        id,
        detailerId
      }
    });

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Delete the employee
    await prisma.employee.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Employee deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting employee:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


