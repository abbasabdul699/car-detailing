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

    // Get the plan to determine the type and stripe price ID
    const { prisma } = await import('@/lib/prisma');
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    const result = await stripeSubscriptionService.createSubscription(
      session.user.id,
      planId,
      plan.stripePriceId,
      plan.type as 'monthly' | 'pay_per_booking'
    );

    // Return the result which may contain checkoutUrl or subscription
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error creating subscription:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create subscription' },
      { status: 500 }
    );
  }
}
