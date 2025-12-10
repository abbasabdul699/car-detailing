import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET: Fetch a single resource by ID
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
      return NextResponse.json({ error: 'Resource ID is required' }, { status: 400 });
    }

    // Fetch the resource and verify it belongs to this detailer
    const resource = await prisma.resource.findFirst({
      where: {
        id,
        detailerId
      },
      include: {
        bookings: {
          select: {
            id: true,
            scheduledDate: true,
            scheduledTime: true,
            status: true
          },
          orderBy: {
            scheduledDate: 'asc'
          }
        }
      }
    });

    if (!resource) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }

    return NextResponse.json({ resource });
  } catch (error) {
    console.error('Error fetching resource:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH: Update a resource
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
    const { name, type } = body;

    if (!id) {
      return NextResponse.json({ error: 'Resource ID is required' }, { status: 400 });
    }

    // Verify the resource exists and belongs to this detailer
    const existingResource = await prisma.resource.findFirst({
      where: {
        id,
        detailerId
      }
    });

    if (!existingResource) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }

    // Build update data
    const updateData: { name?: string; type?: string } = {};
    
    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json(
          { error: 'Name cannot be empty' },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    if (type !== undefined) {
      if (type !== 'bay' && type !== 'van') {
        return NextResponse.json(
          { error: 'Type must be either "bay" or "van"' },
          { status: 400 }
        );
      }
      updateData.type = type.toLowerCase();
    }

    // If name is being changed, check for duplicates
    if (updateData.name && updateData.name !== existingResource.name) {
      const duplicateResource = await prisma.resource.findUnique({
        where: {
          detailerId_name: {
            detailerId,
            name: updateData.name
          }
        }
      });

      if (duplicateResource && duplicateResource.id !== id) {
        return NextResponse.json(
          { error: 'A resource with this name already exists' },
          { status: 409 }
        );
      }
    }

    // Update the resource
    const updatedResource = await prisma.resource.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({
      success: true,
      resource: updatedResource
    });
  } catch (error: any) {
    console.error('Error updating resource:', error);
    
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

// DELETE: Delete a resource
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
      return NextResponse.json({ error: 'Resource ID is required' }, { status: 400 });
    }

    // Verify the resource exists and belongs to this detailer
    const resource = await prisma.resource.findFirst({
      where: {
        id,
        detailerId
      },
      include: {
        bookings: {
          where: {
            status: {
              in: ['pending', 'confirmed']
            }
          }
        }
      }
    });

    if (!resource) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }

    // Check if there are any active bookings for this resource
    if (resource.bookings.length > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete resource with active bookings. Please cancel or reassign bookings first.',
          activeBookings: resource.bookings.length
        },
        { status: 409 }
      );
    }

    // Delete the resource
    await prisma.resource.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Resource deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting resource:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

