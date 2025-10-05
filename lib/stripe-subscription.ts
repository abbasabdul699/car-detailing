import Stripe from 'stripe';
import { prisma } from './prisma';
import { SubscriptionPlan, Subscription, Invoice } from '@/types/subscription';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

export class StripeSubscriptionService {
  // Create a Stripe customer
  async createCustomer(detailerId: string, email: string, name: string) {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        detailerId,
      },
    });

    // Update detailer with Stripe customer ID
    await prisma.detailer.update({
      where: { id: detailerId },
      data: { stripeCustomerId: customer.id },
    });

    return customer;
  }

  // Create a subscription
  async createSubscription(
    detailerId: string,
    planId: string,
    paymentMethodId?: string
  ) {
    const detailer = await prisma.detailer.findUnique({
      where: { id: detailerId },
      include: { subscription: { include: { plan: true } } },
    });

    if (!detailer) {
      throw new Error('Detailer not found');
    }

    // Allow upgrades - if detailer has existing subscription, we'll handle it

    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan || !plan.stripePriceId) {
      throw new Error('Plan not found or not configured for Stripe');
    }

    // Create or get Stripe customer
    let stripeCustomerId = detailer.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await this.createCustomer(
        detailerId,
        detailer.email || '',
        detailer.businessName
      );
      stripeCustomerId = customer.id;
    }

    // Set up payment method if provided
    if (paymentMethodId) {
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: stripeCustomerId,
      });
    }

    // Handle different plan types
    if (plan.type === 'pay_per_booking') {
      // For pay-per-booking plans, we don't create a Stripe subscription
      // Instead, we just create a database record and handle billing per booking
      const dbSubscription = await prisma.subscription.create({
        data: {
          detailerId,
          planId,
          status: 'active',
          stripeSubscriptionId: null, // No Stripe subscription for pay-per-booking
          stripeCustomerId,
          currentPeriodStart: new Date(),
          currentPeriodEnd: null, // No recurring billing
          trialStart: null,
          trialEnd: null,
        },
      });

      return dbSubscription;
    }

    // For monthly plans, create Stripe Checkout Session
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14);

    // Check if detailer is first cohort for discount
    const detailerData = await prisma.detailer.findUnique({
      where: { id: detailerId },
    });

    // Create a Stripe Checkout Session for monthly plans
    const checkoutSessionParams: any = {
      customer: stripeCustomerId,
      line_items: [
        {
          price: plan.stripePriceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/detailer-dashboard/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/detailer-dashboard/subscription?canceled=true`,
      subscription_data: {
        trial_end: Math.floor(trialEnd.getTime() / 1000),
        metadata: {
          detailerId,
          planId,
        },
      },
      metadata: {
        detailerId,
        planId,
      },
    };

    // Apply discount for first cohort at the session level
    if (detailerData?.isFirstCohort && plan.type === 'monthly') {
      checkoutSessionParams.discounts = [{
        coupon: process.env.STRIPE_FIRST_COHORT_COUPON_ID || 'first_cohort_15_off',
      }];
    }

    const checkoutSession = await stripe.checkout.sessions.create(checkoutSessionParams);

    if (!checkoutSession.url) {
      throw new Error('Failed to create Stripe Checkout Session URL');
    }

    // For monthly plans, we return the checkout URL for redirection
    return { subscription: null, checkoutUrl: checkoutSession.url };
  }

  // Get subscription status
  async getSubscriptionStatus(detailerId: string) {
    const detailer = await prisma.detailer.findUnique({
      where: { id: detailerId },
      include: {
        subscription: {
          include: { plan: true },
        },
      },
    });

    if (!detailer) {
      return {
        isActive: false,
        isTrial: false,
        currentPlan: null,
        canUpgrade: true,
        canDowngrade: false,
      };
    }

    // Check if detailer is in admin-controlled trial period
    const now = new Date();
    const isInTrialPeriod = detailer.trialEndsAt && new Date(detailer.trialEndsAt) > now;
    
    let trialDaysRemaining: number | undefined;
    if (isInTrialPeriod && detailer.trialEndsAt) {
      const trialEnd = new Date(detailer.trialEndsAt);
      const diffTime = trialEnd.getTime() - now.getTime();
      trialDaysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    // If no subscription but in trial period
    if (!detailer.subscription && isInTrialPeriod) {
      return {
        isActive: false,
        isTrial: true,
        trialDaysRemaining,
        currentPlan: null,
        canUpgrade: true,
        canDowngrade: false,
      };
    }

    // If no subscription and not in trial
    if (!detailer.subscription) {
      return {
        isActive: false,
        isTrial: false,
        currentPlan: null,
        canUpgrade: true,
        canDowngrade: false,
      };
    }

    const subscription = detailer.subscription;
    const isStripeTrial = subscription.status === 'trial';
    const isActive = subscription.status === 'active';
    
    // Calculate Stripe trial days if applicable
    let stripeTrialDaysRemaining: number | undefined;
    if (isStripeTrial && subscription.trialEnd) {
      const trialEnd = new Date(subscription.trialEnd);
      const diffTime = trialEnd.getTime() - now.getTime();
      stripeTrialDaysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    return {
      isActive,
      isTrial: isInTrialPeriod || isStripeTrial,
      trialDaysRemaining: trialDaysRemaining || stripeTrialDaysRemaining,
      currentPlan: subscription.plan,
      nextBillingDate: subscription.currentPeriodEnd,
      canUpgrade: subscription.plan.type === 'pay_per_booking',
      canDowngrade: subscription.plan.type === 'monthly',
    };
  }

  // Create customer portal session
  async createCustomerPortalSession(detailerId: string) {
    const detailer = await prisma.detailer.findUnique({
      where: { id: detailerId },
    });

    if (!detailer || !detailer.stripeCustomerId) {
      throw new Error('Detailer not found or not connected to Stripe');
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: detailer.stripeCustomerId,
      return_url: `${process.env.NEXTAUTH_URL}/detailer-dashboard/subscription`,
    });

    return session;
  }

  // Handle webhook events
  async handleWebhook(event: Stripe.Event) {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionChange(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.payment_succeeded':
        await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
    }
  }

  private async handleSubscriptionChange(subscription: Stripe.Subscription) {
    const detailerId = subscription.metadata.detailerId;
    if (!detailerId) return;

    const status = subscription.status === 'active' ? 'active' : 
                  subscription.status === 'past_due' ? 'past_due' : 'incomplete';

    await prisma.subscription.updateMany({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      },
    });
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    await prisma.subscription.updateMany({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: 'canceled',
        canceledAt: new Date(),
      },
    });
  }

  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
    if (!invoice.subscription) return;

    const dbSubscription = await prisma.subscription.findFirst({
      where: { stripeSubscriptionId: invoice.subscription as string },
    });

    if (!dbSubscription) return;

    // Create invoice record
    const dbInvoice = await prisma.invoice.create({
      data: {
        subscriptionId: dbSubscription.id,
        stripeInvoiceId: invoice.id,
        amount: invoice.amount_paid / 100, // Convert from cents
        currency: invoice.currency,
        status: 'paid',
        periodStart: new Date(invoice.period_start * 1000),
        periodEnd: new Date(invoice.period_end * 1000),
        paidAt: new Date(),
      },
    });

    // Send billing email
    try {
      const { billingEmailService } = await import('./billing-email');
      await billingEmailService.sendInvoiceEmail(dbInvoice.id);
    } catch (error) {
      console.error('Failed to send billing email:', error);
    }
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    if (!invoice.subscription) return;

    const dbSubscription = await prisma.subscription.findFirst({
      where: { stripeSubscriptionId: invoice.subscription as string },
    });

    if (!dbSubscription) return;

    // Update subscription status
    await prisma.subscription.update({
      where: { id: dbSubscription.id },
      data: { status: 'past_due' },
    });

    // Send payment failed notification
    try {
      const { billingEmailService } = await import('./billing-email');
      await billingEmailService.sendPaymentFailedNotification(dbSubscription.detailerId);
    } catch (error) {
      console.error('Failed to send payment failed notification:', error);
    }
  }

  // Get invoices for a detailer
  async getInvoices(detailerId: string) {
    const subscription = await prisma.subscription.findUnique({
      where: { detailerId },
      include: {
        invoices: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return subscription?.invoices || [];
  }
}

export const stripeSubscriptionService = new StripeSubscriptionService();
