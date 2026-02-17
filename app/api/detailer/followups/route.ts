import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { detailerAuthOptions } from '@/app/api/auth-detailer/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/detailer/followups - Fetch all followups for the authenticated detailer
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(detailerAuthOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const detailerId = session.user.id;

    const followups = await prisma.followup.findMany({
      where: { detailerId },
      orderBy: { scheduledDate: 'asc' },
    });

    return NextResponse.json({ followups });
  } catch (error) {
    console.error('Error fetching followups:', error);
    return NextResponse.json({ error: 'Failed to fetch followups' }, { status: 500 });
  }
}

// POST /api/detailer/followups - Create a new followup
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(detailerAuthOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const detailerId = session.user.id;
    const body = await request.json();
    const {
      customerId,
      customerName,
      customerPhone,
      customerEmail,
      vehicleInfo,
      vehicles,
      lastService,
      daysSinceVisit,
      scheduledDate,
      scheduledTime,
      draftMessage,
      priority,
      status,
      channel,
      notes,
      reasonLine,
      confidenceScore,
      tags,
      locationType,
    } = body;

    if (!customerName || !customerName.trim()) {
      return NextResponse.json({ error: 'Customer name is required' }, { status: 400 });
    }

    if (!scheduledDate) {
      return NextResponse.json({ error: 'Scheduled date is required' }, { status: 400 });
    }

    const followup = await prisma.followup.create({
      data: {
        detailerId,
        customerId: customerId || null,
        customerName: customerName.trim(),
        customerPhone: customerPhone || null,
        customerEmail: customerEmail || null,
        vehicleInfo: vehicleInfo || null,
        vehicles: vehicles || [],
        lastService: lastService || null,
        daysSinceVisit: daysSinceVisit ?? null,
        scheduledDate: new Date(scheduledDate),
        scheduledTime: scheduledTime || null,
        draftMessage: draftMessage || null,
        priority: priority || 'medium',
        status: status || 'scheduled',
        channel: channel || 'sms',
        notes: notes || null,
        reasonLine: reasonLine || null,
        confidenceScore: confidenceScore ?? null,
        tags: tags || [],
        locationType: locationType || null,
      },
    });

    return NextResponse.json({ followup }, { status: 201 });
  } catch (error) {
    console.error('Error creating followup:', error);
    return NextResponse.json({ error: 'Failed to create followup' }, { status: 500 });
  }
}
