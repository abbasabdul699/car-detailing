import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is admin
    if (!session || !session.user?.id || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    const { detailerId, twilioPhoneNumber, smsEnabled } = await request.json();

    if (!detailerId) {
      return NextResponse.json({ error: 'Detailer ID is required' }, { status: 400 });
    }

    // Update SMS settings for the specified detailer
    const updatedDetailer = await prisma.detailer.update({
      where: { id: detailerId },
      data: {
        twilioPhoneNumber: twilioPhoneNumber || null,
        smsEnabled: Boolean(smsEnabled),
      },
      select: {
        id: true,
        businessName: true,
        email: true,
        twilioPhoneNumber: true,
        smsEnabled: true,
      },
    });

    return NextResponse.json({ 
      success: true, 
      detailer: updatedDetailer 
    });
  } catch (error) {
    console.error('Admin SMS settings update error:', error);
    return NextResponse.json({ error: 'Failed to update SMS settings' }, { status: 500 });
  }
}
