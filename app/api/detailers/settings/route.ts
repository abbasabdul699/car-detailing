import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const data = await request.json();
    
    const updatedDetailer = await prisma.detailer.update({
      where: { email: session.user.email },
      data: {
        notificationPreferences: data.notifications,
        privacySettings: data.privacy,
        // Add other settings as needed
      }
    });

    return NextResponse.json(updatedDetailer);
  } catch (error) {
    console.error('Settings update error:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
} 