import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const detailer = await prisma.detailer.findUnique({
      where: { email: session.user.email },
      include: {
        bookings: {
          where: {
            status: 'COMPLETED'
          }
        }
      }
    });

    if (!detailer) {
      return NextResponse.json({ error: 'Detailer not found' }, { status: 404 });
    }

    // Get visits within all time
    const visits = await prisma.pageVisit.findMany({
      where: {
        detailerId: detailer.id,
      }
    });

    // Calculate metrics
    const profileViews = visits.length;
    const uniqueVisitors = new Set(visits.map(v => v.visitorId)).size;
    const completedJobs = detailer.bookings.length;

    const response = {
      profileViews,
      uniqueVisitors,
      completedJobs,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
} 