import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { detailerAuthOptions } from '@/app/api/auth-detailer/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function DELETE() {
  try {
    const session = await getServerSession(detailerAuthOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const detailerId = session.user.id;

    const [customers, followups] = await Promise.all([
      prisma.customerSnapshot.deleteMany({ where: { detailerId } }),
      prisma.followup.deleteMany({ where: { detailerId } }),
    ]);

    return NextResponse.json({
      success: true,
      count: customers.count,
      followupsRemoved: followups.count,
    });
  } catch (error) {
    console.error('Error deleting all customers:', error);
    return NextResponse.json({ error: 'Failed to delete all customers' }, { status: 500 });
  }
}
