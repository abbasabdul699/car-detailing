import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { detailerAuthOptions } from '@/app/api/auth-detailer/[...nextauth]/route';
import { stripeSubscriptionService } from '@/lib/stripe-subscription';

export async function GET() {
  try {
    const session = await getServerSession(detailerAuthOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const status = await stripeSubscriptionService.getSubscriptionStatus(session.user.id);
    
    return NextResponse.json({ status });
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription status' },
      { status: 500 }
    );
  }
}
