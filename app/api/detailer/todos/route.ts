import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { detailerAuthOptions } from '@/app/api/auth-detailer/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/detailer/todos - Fetch all todo items for the authenticated detailer
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(detailerAuthOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const detailerId = session.user.id;

    const todos = await prisma.todoItem.findMany({
      where: { detailerId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ todos });
  } catch (error) {
    console.error('Error fetching todos:', error);
    return NextResponse.json({ error: 'Failed to fetch todos' }, { status: 500 });
  }
}

// POST /api/detailer/todos - Create a new todo item
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(detailerAuthOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const detailerId = session.user.id;
    const body = await request.json();
    const { title, subtitle, type, priority, customerPhone, customerName, dueDate, dueTime } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const todo = await prisma.todoItem.create({
      data: {
        detailerId,
        title: title.trim(),
        subtitle: subtitle?.trim() || null,
        type: type || 'todo',
        priority: priority || 'medium',
        customerPhone: customerPhone || null,
        customerName: customerName || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        dueTime: dueTime || null,
      },
    });

    return NextResponse.json({ todo }, { status: 201 });
  } catch (error) {
    console.error('Error creating todo:', error);
    return NextResponse.json({ error: 'Failed to create todo' }, { status: 500 });
  }
}
