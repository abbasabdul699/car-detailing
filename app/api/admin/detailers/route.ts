import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is admin
    if (!session || !session.user?.id || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    // Get all detailers with SMS settings
    const detailers = await prisma.detailer.findMany({
      select: {
        id: true,
        businessName: true,
        email: true,
        twilioPhoneNumber: true,
        smsEnabled: true,
      },
      orderBy: { businessName: 'asc' }
    });

    return NextResponse.json({ detailers });
  } catch (error) {
    console.error('Admin detailers fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch detailers' }, { status: 500 });
  }
}
