import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '../../[...nextauth]/route';
import { generateVerificationCode, sendEmail } from '@/lib/auth';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST,
  port: Number(process.env.EMAIL_SERVER_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  }
});

export async function POST(request: Request) {
  try {
    console.log('Starting 2FA code send process...');
    
    const session = await getServerSession(authOptions);
    console.log('Session data:', {
      email: session?.user?.email,
      hasSession: !!session
    });

    if (!session?.user?.email) {
      console.log('No session or email found');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const detailer = await prisma.detailer.findUnique({
      where: { email: session.user.email }
    });
    console.log('Detailer lookup result:', {
      found: !!detailer,
      email: session.user.email
    });

    if (!detailer) {
      console.log('Detailer not found:', session.user.email);
      return NextResponse.json({ error: 'Detailer not found' }, { status: 404 });
    }

    const verificationCode = generateVerificationCode();
    console.log('Generated verification code for:', {
      email: detailer.email,
      code: verificationCode
    });

    // Save the code
    await prisma.detailer.update({
      where: { email: session.user.email },
      data: {
        twoFactorCode: verificationCode,
        twoFactorExpiry: new Date(Date.now() + 10 * 60 * 1000)
      }
    });
    console.log('Saved verification code to database');

    try {
      console.log('Attempting to send verification email...');
      const info = await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: detailer.email,
        subject: "Your 2FA Verification Code",
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Your Verification Code</h2>
            <p>Your verification code is: <strong>${verificationCode}</strong></p>
            <p>This code will expire in 10 minutes.</p>
          </div>
        `
      });
      console.log('2FA email sent:', info.messageId);
      return NextResponse.json({ success: true });
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      return NextResponse.json({ error: 'Failed to send verification email' }, { status: 500 });
    }
  } catch (error) {
    console.error('2FA send code error:', error);
    return NextResponse.json({ error: 'Failed to send verification code' }, { status: 500 });
  }
} 