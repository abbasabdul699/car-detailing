import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const detailerId = session.user.id;
    const body = await request.json();
    const { twilioPhoneNumber } = body;

    if (!twilioPhoneNumber) {
      return NextResponse.json({ error: 'Twilio phone number is required' }, { status: 400 });
    }

    // Update the detailer's Twilio phone number
    const updatedDetailer = await prisma.detailer.update({
      where: { id: detailerId },
      data: { twilioPhoneNumber: twilioPhoneNumber },
      select: {
        id: true,
        twilioPhoneNumber: true,
        businessName: true
      }
    });

    return NextResponse.json({ success: true, detailer: updatedDetailer }, { status: 200 });
  } catch (error: any) {
    console.error('Error updating Twilio phone number:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update Twilio phone number' },
      { status: 500 }
    );
  }
}
