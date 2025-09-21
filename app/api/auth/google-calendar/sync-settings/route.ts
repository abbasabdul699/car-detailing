import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const detailerId = session.user.id;
    const body = await request.json();
    const { appointments, availability } = body;

    // Update sync settings
    const updateData: any = {};
    if (typeof appointments === 'boolean') {
      updateData.syncAppointments = appointments;
    }
    if (typeof availability === 'boolean') {
      updateData.syncAvailability = availability;
    }

    await prisma.detailer.update({
      where: { id: detailerId },
      data: updateData,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Google Calendar sync settings error:', error);
    return NextResponse.json({ error: 'Failed to update sync settings' }, { status: 500 });
  }
}
