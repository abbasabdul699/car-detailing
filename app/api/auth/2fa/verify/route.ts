import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '../../[...nextauth]/route';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { code, method } = await request.json();

    const detailer = await prisma.detailer.findUnique({
      where: { email: session.user.email }
    });

    if (!detailer) {
      return NextResponse.json({ error: 'Detailer not found' }, { status: 404 });
    }

    // Check if code is valid and not expired
    if (
      detailer.twoFactorCode !== code ||
      !detailer.twoFactorExpiry ||
      new Date() > detailer.twoFactorExpiry
    ) {
      return NextResponse.json(
        { error: 'Invalid or expired code' },
        { status: 400 }
      );
    }

    // Enable 2FA and clear the verification code
    await prisma.detailer.update({
      where: { email: session.user.email },
      data: {
        twoFactorEnabled: true,
        twoFactorMethod: method,
        twoFactorCode: null,
        twoFactorExpiry: null
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('2FA verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify code' },
      { status: 500 }
    );
  }
} 