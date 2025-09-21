import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { twilioPhoneNumber, smsEnabled } = await request.json();

    // Update SMS settings for the logged-in detailer
    const updatedDetailer = await prisma.detailer.update({
      where: { id: session.user.id },
      data: {
        twilioPhoneNumber: twilioPhoneNumber || null,
        smsEnabled: Boolean(smsEnabled),
      },
      select: {
        id: true,
        businessName: true,
        twilioPhoneNumber: true,
        smsEnabled: true,
      },
    });

    return NextResponse.json({ 
      success: true, 
      detailer: updatedDetailer 
    });
  } catch (error) {
    console.error('SMS settings update error:', error);
    return NextResponse.json({ error: 'Failed to update SMS settings' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get SMS settings for the logged-in detailer
    const detailer = await prisma.detailer.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        businessName: true,
        twilioPhoneNumber: true,
        smsEnabled: true,
      },
    });

    if (!detailer) {
      return NextResponse.json({ error: 'Detailer not found' }, { status: 404 });
    }

    return NextResponse.json({ detailer });
  } catch (error) {
    console.error('SMS settings fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch SMS settings' }, { status: 500 });
  }
}
