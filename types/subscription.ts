export interface SubscriptionPlan {
  id: string;
  name: string;
  type: 'pay_per_booking' | 'monthly';
  price: number;
  stripePriceId?: string;
  description: string;
  features: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Subscription {
  id: string;
  detailerId: string;
  planId: string;
  status: 'trial' | 'active' | 'past_due' | 'canceled' | 'incomplete';
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  trialStart?: Date;
  trialEnd?: Date;
  canceledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  plan?: SubscriptionPlan;
}

export interface Invoice {
  id: string;
  subscriptionId: string;
  stripeInvoiceId?: string;
  amount: number;
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  periodStart: Date;
  periodEnd: Date;
  dueDate?: Date;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface DetailerWithSubscription {
  id: string;
  businessName: string;
  email?: string;
  stripeCustomerId?: string;
  trialEndsAt?: Date;
  isFirstCohort: boolean;
  subscription?: Subscription;
}

export interface CreateSubscriptionRequest {
  planId: string;
  paymentMethodId?: string;
}

export interface UpdateSubscriptionRequest {
  planId: string;
}

export interface StripeCustomerPortalResponse {
  url: string;
}

export interface SubscriptionStatus {
  isActive: boolean;
  isTrial: boolean;
  trialDaysRemaining?: number;
  currentPlan?: SubscriptionPlan;
  nextBillingDate?: Date;
  canUpgrade: boolean;
  canDowngrade: boolean;
}
