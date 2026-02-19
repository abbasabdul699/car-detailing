import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { detailerAuthOptions } from '@/app/api/auth-detailer/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// PATCH /api/detailer/followups/[id] - Update a followup
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(detailerAuthOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const detailerId = session.user.id;
    const { id } = await params;
    const body = await request.json();

    // Verify the followup belongs to this detailer
    const existing = await prisma.followup.findFirst({
      where: { id, detailerId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Followup not found' }, { status: 404 });
    }

    // Build update data, only including fields that were provided
    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      'customerName', 'customerPhone', 'customerEmail', 'vehicleInfo',
      'vehicles', 'lastService', 'daysSinceVisit', 'scheduledTime',
      'draftMessage', 'priority', 'status', 'channel', 'notes',
      'reasonLine', 'confidenceScore', 'tags', 'locationType', 'customerId', 'aiReasoning',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (body.scheduledDate !== undefined) {
      updateData.scheduledDate = new Date(body.scheduledDate);
    }

    const followup = await prisma.followup.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ followup });
  } catch (error) {
    console.error('Error updating followup:', error);
    return NextResponse.json({ error: 'Failed to update followup' }, { status: 500 });
  }
}

// DELETE /api/detailer/followups/[id] - Delete a followup
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(detailerAuthOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const detailerId = session.user.id;
    const { id } = await params;

    // Verify the followup belongs to this detailer
    const existing = await prisma.followup.findFirst({
      where: { id, detailerId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Followup not found' }, { status: 404 });
    }

    await prisma.followup.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting followup:', error);
    return NextResponse.json({ error: 'Failed to delete followup' }, { status: 500 });
  }
}
