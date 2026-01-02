import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { detailerAuthOptions } from '@/app/api/auth-detailer/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(detailerAuthOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const detailerId = session.user.id;
    const body = await request.json();
    const { personalPhoneNumber } = body;

    if (!personalPhoneNumber) {
      return NextResponse.json({ error: 'Personal phone number is required' }, { status: 400 });
    }

    // Update the detailer's personal phone number
    const updatedDetailer = await prisma.detailer.update({
      where: { id: detailerId },
      data: { personalPhoneNumber },
      select: {
        id: true,
        personalPhoneNumber: true,
        businessName: true
      }
    });

    return NextResponse.json({ 
      success: true, 
      personalPhoneNumber: updatedDetailer.personalPhoneNumber 
    });

  } catch (error) {
    console.error('Error updating personal phone number:', error);
    return NextResponse.json(
      { error: 'Failed to update personal phone number' },
      { status: 500 }
    );
  }
}
