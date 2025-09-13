import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from '@/lib/prisma';

// GET: Get SMS settings for the logged-in detailer
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const detailer = await prisma.detailer.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        businessName: true,
        twilioPhoneNumber: true,
        smsEnabled: true
      }
    });

    if (!detailer) {
      return NextResponse.json({ error: 'Detailer not found' }, { status: 404 });
    }

    return NextResponse.json({
      detailer: {
        id: detailer.id,
        businessName: detailer.businessName,
        twilioPhoneNumber: detailer.twilioPhoneNumber,
        smsEnabled: detailer.smsEnabled
      }
    });
  } catch (error) {
    console.error('Error fetching SMS settings:', error);
    return NextResponse.json({ error: 'Failed to fetch SMS settings' }, { status: 500 });
  }
}

// POST: Update SMS settings for the logged-in detailer
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { twilioPhoneNumber, smsEnabled } = await request.json();

    // Validate phone number format
    if (twilioPhoneNumber && !twilioPhoneNumber.match(/^\+[1-9]\d{1,14}$/)) {
      return NextResponse.json({ 
        error: 'Invalid phone number format. Please use international format (e.g., +1234567890)' 
      }, { status: 400 });
    }

    const updatedDetailer = await prisma.detailer.update({
      where: { id: session.user.id },
      data: {
        twilioPhoneNumber: twilioPhoneNumber || null,
        smsEnabled: smsEnabled || false
      },
      select: {
        id: true,
        businessName: true,
        twilioPhoneNumber: true,
        smsEnabled: true
      }
    });

    return NextResponse.json({
      message: 'SMS settings updated successfully',
      detailer: updatedDetailer
    });
  } catch (error) {
    console.error('Error updating SMS settings:', error);
    return NextResponse.json({ error: 'Failed to update SMS settings' }, { status: 500 });
  }
}
