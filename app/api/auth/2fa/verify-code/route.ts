import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { email, code } = await req.json();
    
    const user = await prisma.detailer.findUnique({
      where: { email }
    });

    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
    }

    // Verify the code matches and hasn't expired
    if (
      user.twoFactorCode === code &&
      user.twoFactorExpiry &&
      new Date() < new Date(user.twoFactorExpiry)
    ) {
      // Enable 2FA for the user
      await prisma.detailer.update({
        where: { id: user.id },
        data: {
          twoFactorEnabled: true,
          twoFactorCode: null,
          twoFactorExpiry: null
        }
      });

      return new Response(JSON.stringify({ success: true }));
    }

    return new Response(JSON.stringify({ error: 'Invalid or expired code' }), { status: 400 });
  } catch (error) {
    console.error('2FA verification error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
} 