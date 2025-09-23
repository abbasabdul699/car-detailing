import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Disconnect calendar
    await prisma.detailer.update({
      where: { id: session.user.id },
      data: {
        googleCalendarConnected: false,
        googleCalendarTokens: null,
        googleCalendarRefreshToken: null,
        syncAppointments: false,
        syncAvailability: false,
      },
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error disconnecting calendar:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect calendar' },
      { status: 500 }
    );
  }
}
