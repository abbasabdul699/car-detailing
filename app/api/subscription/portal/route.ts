import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { detailerAuthOptions } from '@/app/api/auth-detailer/[...nextauth]/route';
import { stripeSubscriptionService } from '@/lib/stripe-subscription';
import { prisma } from '@/lib/prisma';

export async function POST() {
  try {
    const session = await getServerSession(detailerAuthOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if detailer has a Stripe customer ID
    const detailer = await prisma.detailer.findUnique({
      where: { id: session.user.id },
      select: { stripeCustomerId: true }
    });

    if (!detailer?.stripeCustomerId) {
      return NextResponse.json({ 
        error: 'No active subscription found. Please subscribe to a plan first.',
        needsSubscription: true 
      }, { status: 400 });
    }

    const portalSession = await stripeSubscriptionService.createCustomerPortalSession(
      session.user.id
    );

    return NextResponse.json({ url: portalSession.url });
  } catch (error: any) {
    console.error('Error creating customer portal session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create customer portal session' },
      { status: 500 }
    );
  }
}
