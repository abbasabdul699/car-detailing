import { prisma } from '@/lib/prisma';
import { compare } from 'bcrypt';
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

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    // Find the user
    const user = await prisma.detailer.findUnique({
      where: { email }
    });

    if (!user) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401 });
    }

    // Verify password
    const passwordValid = await compare(password, user.password);
    if (!passwordValid) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401 });
    }

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      // Generate new 2FA code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Save the code to the database
      await prisma.detailer.update({
        where: { id: user.id },
        data: {
          twoFactorCode: code,
          twoFactorExpiry: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes expiry
        }
      });

      // Send the code via email
      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: email,
        subject: 'Login Verification Code',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Your Login Verification Code</h2>
            <p>Your verification code is: <strong>${code}</strong></p>
            <p>This code will expire in 10 minutes.</p>
          </div>
        `
      });

      return new Response(JSON.stringify({ requires2FA: true }));
    }

    // If 2FA is not enabled, return success
    return new Response(JSON.stringify({ success: true }));
  } catch (error) {
    console.error('Login error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
} 