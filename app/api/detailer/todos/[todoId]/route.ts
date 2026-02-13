import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { detailerAuthOptions } from '@/app/api/auth-detailer/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// PATCH /api/detailer/todos/[todoId] - Update a todo item
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ todoId: string }> }
) {
  try {
    const session = await getServerSession(detailerAuthOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const detailerId = session.user.id;
    const { todoId } = await params;
    const body = await request.json();

    // Verify the todo belongs to this detailer
    const existing = await prisma.todoItem.findFirst({
      where: { id: todoId, detailerId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
    }

    const updateData: any = {};

    if (body.title !== undefined) updateData.title = body.title.trim();
    if (body.subtitle !== undefined) updateData.subtitle = body.subtitle?.trim() || null;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.customerPhone !== undefined) updateData.customerPhone = body.customerPhone || null;
    if (body.customerName !== undefined) updateData.customerName = body.customerName || null;
    if (body.dueDate !== undefined) updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (body.dueTime !== undefined) updateData.dueTime = body.dueTime || null;

    if (body.status !== undefined) {
      updateData.status = body.status;
      if (body.status === 'completed') {
        updateData.completedAt = new Date();
      } else if (body.status === 'active') {
        updateData.completedAt = null;
      }
    }

    const todo = await prisma.todoItem.update({
      where: { id: todoId },
      data: updateData,
    });

    return NextResponse.json({ todo });
  } catch (error) {
    console.error('Error updating todo:', error);
    return NextResponse.json({ error: 'Failed to update todo' }, { status: 500 });
  }
}

// DELETE /api/detailer/todos/[todoId] - Delete a todo item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ todoId: string }> }
) {
  try {
    const session = await getServerSession(detailerAuthOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const detailerId = session.user.id;
    const { todoId } = await params;

    // Verify the todo belongs to this detailer
    const existing = await prisma.todoItem.findFirst({
      where: { id: todoId, detailerId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
    }

    await prisma.todoItem.delete({
      where: { id: todoId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting todo:', error);
    return NextResponse.json({ error: 'Failed to delete todo' }, { status: 500 });
  }
}
