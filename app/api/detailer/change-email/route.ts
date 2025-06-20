import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { newEmail } = await request.json();
  if (!newEmail) {
    return NextResponse.json({ error: 'New email is required' }, { status: 400 });
  }
  // Check if new email is already in use
  const existing = await prisma.detailer.findUnique({ where: { email: newEmail } });
  if (existing) {
    return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
  }
  // Get old email before update
  const detailer = await prisma.detailer.findUnique({ where: { email: session.user.email } });
  const oldEmail = detailer?.email;
  // Update email
  await prisma.detailer.update({
    where: { email: session.user.email },
    data: { email: newEmail }
  });
  // Send notification to old email
  if (oldEmail) {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: oldEmail,
      subject: 'Your email has been changed',
      html: `
        <div style="max-width:480px;margin:0 auto;font-family:'Segoe UI',Arial,sans-serif;background:#f9f9f9;padding:32px 24px;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
          <div style="text-align:center;margin-bottom:24px;">
            <img src="https://reevacar.s3.us-east-2.amazonaws.com/reeva-logo/logo.png" alt="ReevaCar Logo" style="height:48px;margin-bottom:8px;" />
            <h2 style="color:#0A2217;margin:0;font-size:1.5rem;">Email Change Notification</h2>
          </div>
          <p style="color:#222;font-size:1.1rem;margin-bottom:16px;">
            Hello,
          </p>
          <p style="color:#222;font-size:1.1rem;margin-bottom:16px;">
            This is a confirmation that the email address for your <b>Reeva</b> account has been changed.
          </p>
          <div style="background:#fff;border-radius:8px;padding:16px 20px;margin-bottom:16px;border:1px solid #e0e0e0;">
            <p style="margin:0 0 8px 0;color:#555;">Your new email address:</p>
            <p style="margin:0;font-size:1.15rem;font-weight:bold;color:#0A2217;">${newEmail}</p>
          </div>
          <p style="color:#222;font-size:1.05rem;margin-bottom:20px;">
            If you did <b>not</b> request this change, please contact our support team immediately at
            <a href="mailto:reevacar@gmail.com" style="color:#389167;text-decoration:none;">reevacar@gmail.com</a>.
          </p>
          <div style="text-align:center;color:#888;font-size:0.95rem;margin-top:32px;">
            &mdash; The ReevaCar Team
          </div>
        </div>
      `
    });
  }
  return NextResponse.json({ success: true });
} 