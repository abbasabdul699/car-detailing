import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { detailerAuthOptions } from '@/app/api/auth-detailer/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST /api/detailer/followups/import - Bulk import followups
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(detailerAuthOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const detailerId = session.user.id;
    const body = await request.json();
    const { followups } = body;

    if (!Array.isArray(followups) || followups.length === 0) {
      return NextResponse.json({ error: 'followups array is required and must not be empty' }, { status: 400 });
    }

    const created = [];
    for (const item of followups) {
      if (!item.customerName || !item.scheduledDate) {
        continue;
      }

      const followup = await prisma.followup.create({
        data: {
          detailerId,
          customerId: item.customerId || null,
          customerName: item.customerName.trim(),
          customerPhone: item.customerPhone || null,
          customerEmail: item.customerEmail || null,
          vehicleInfo: item.vehicleInfo || null,
          vehicles: item.vehicles || [],
          lastService: item.lastService || null,
          daysSinceVisit: item.daysSinceVisit ?? null,
          scheduledDate: new Date(item.scheduledDate),
          scheduledTime: item.scheduledTime || null,
          draftMessage: item.draftMessage || null,
          priority: item.priority || 'medium',
          status: item.status || 'scheduled',
          channel: item.channel || 'sms',
          notes: item.notes || null,
          reasonLine: item.reasonLine || null,
          confidenceScore: item.confidenceScore ?? null,
          tags: item.tags || [],
          locationType: item.locationType || null,
        },
      });
      created.push(followup);
    }

    return NextResponse.json({ followups: created, count: created.length }, { status: 201 });
  } catch (error) {
    console.error('Error importing followups:', error);
    return NextResponse.json({ error: 'Failed to import followups' }, { status: 500 });
  }
}
