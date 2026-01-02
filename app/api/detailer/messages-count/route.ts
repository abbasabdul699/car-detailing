import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { detailerAuthOptions } from '@/app/api/auth-detailer/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(detailerAuthOptions);

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const detailerId = session.user.id;

    // Get current month start and end dates
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Count messages for this month
    const messagesCount = await prisma.message.count({
      where: {
        conversation: {
          detailerId: detailerId
        },
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      }
    });

    // Get last month's count for comparison
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const lastMonthCount = await prisma.message.count({
      where: {
        conversation: {
          detailerId: detailerId
        },
        createdAt: {
          gte: lastMonthStart,
          lte: lastMonthEnd
        }
      }
    });

    // Calculate percentage change
    const percentageChange = lastMonthCount > 0 
      ? Math.round(((messagesCount - lastMonthCount) / lastMonthCount) * 100)
      : messagesCount > 0 ? 100 : 0;

    return NextResponse.json({
      messagesThisMonth: messagesCount,
      lastMonthCount,
      percentageChange
    });

  } catch (error) {
    console.error('Error fetching messages count:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages count' },
      { status: 500 }
    );
  }
}
