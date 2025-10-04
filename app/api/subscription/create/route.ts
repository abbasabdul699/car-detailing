import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { stripeSubscriptionService } from '@/lib/stripe-subscription';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { planId, paymentMethodId } = await request.json();

    if (!planId) {
      return NextResponse.json(
        { error: 'Plan ID is required' },
        { status: 400 }
      );
    }

    const subscription = await stripeSubscriptionService.createSubscription(
      session.user.id,
      planId,
      paymentMethodId
    );

    return NextResponse.json({ subscription });
  } catch (error: any) {
    console.error('Error creating subscription:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create subscription' },
      { status: 500 }
    );
  }
}
