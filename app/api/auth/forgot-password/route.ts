import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Find the detailer by email
    const detailer = await prisma.detailer.findFirst({
      where: { email: email.toLowerCase() }
    });

    if (!detailer) {
      return NextResponse.json({ 
        error: 'No account found with that email address.' 
      }, { status: 404 });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    // Update detailer with reset token
    await prisma.detailer.update({
      where: { id: detailer.id },
      data: {
        resetToken,
        resetTokenExpiry
      }
    });

    // Send reset email
    const resetUrl = `${process.env.NEXTAUTH_URL}/detailer-login/reset-password?token=${resetToken}`;
    
    try {
      await sendPasswordResetEmail(detailer.email!, detailer.businessName, resetUrl);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      // Still return success to user for security
    }

    return NextResponse.json({ 
      message: 'Password reset link sent to your email!' 
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
