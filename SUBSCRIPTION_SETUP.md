# 💳 ReevaCar Subscription & Billing Setup Guide

This guide will help you set up the complete subscription and billing system for ReevaCar using Stripe integration.

## 🎯 Overview

The subscription system includes:
- **Subscription plan**: Detailer Pro (monthly)
- **14-day free trial** for all new detailers
- **First cohort discount** for the first 10 detailers
- **Stripe integration** for secure payment processing
- **Customer portal** for self-service subscription management
- **Automatic invoicing** with email delivery

## 📋 Prerequisites

1. **Stripe Account**: Sign up at [stripe.com](https://stripe.com)
2. **Environment Variables**: Configure Stripe keys
3. **Database**: MongoDB with Prisma setup

## 🔧 Step 1: Stripe Configuration

### 1.1 Get Stripe API Keys

1. Log into your [Stripe Dashboard](https://dashboard.stripe.com)
2. Go to **Developers** → **API Keys**
3. Copy your:
   - **Publishable key** (pk_live_... or pk_test_...)
   - **Secret key** (sk_live_... or sk_test_...)

### 1.2 Set Up Webhook Endpoint

1. In Stripe Dashboard, go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Set **Endpoint URL**: `https://yourdomain.com/api/webhooks/stripe`
4. Select these events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the **Webhook signing secret**

### 1.3 Create Products and Prices in Stripe

1. Go to **Products** in Stripe Dashboard
2. Create two products:

<!-- Starter product discontinued -->

**Detailer Pro Product:**
- Name: "Detailer Pro"
- Description: "Monthly subscription for detailers"
- Price: $200.00 per month (recurring)

3. Copy the **Price IDs** for each product

## 🔑 Step 2: Environment Variables

Add these to your `.env` file:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_your_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_live_your_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Application URL (for webhooks and redirects)
NEXTAUTH_URL=https://yourdomain.com
```

## 🗄️ Step 3: Database Setup

### 3.1 Update Prisma Schema

The schema has been updated with subscription models. Run:

```bash
# Generate Prisma client
npx prisma generate

# Push schema changes to database
npx prisma db push
```

### 3.2 Seed Subscription Plans

```bash
# Run the seed script
node scripts/seed-subscription-plans.js
```

### 3.3 Set Up First Cohort

```bash
# Mark first 10 detailers for discounted rate
node scripts/setup-first-cohort.js
```

## 🚀 Step 4: Update Stripe Price IDs

After creating products in Stripe, update the database:

```javascript
// Update starter plan price ID
await prisma.subscriptionPlan.update({
  where: { name: 'Detailer Starter' },
  data: { stripePriceId: 'price_starter_from_stripe' }
});

// Update pro plan price ID
await prisma.subscriptionPlan.update({
  where: { name: 'Detailer Pro' },
  data: { stripePriceId: 'price_pro_from_stripe' }
});
```

## 📱 Step 5: Test the System

### 5.1 Test Subscription Creation

1. Go to `/detailer-dashboard/subscription`
2. Try creating a subscription
3. Check Stripe Dashboard for the subscription

### 5.2 Test Customer Portal

1. Click "Manage Subscription" button
2. Verify you can access Stripe's customer portal
3. Test updating payment methods

### 5.3 Test Webhooks

1. Create a test subscription in Stripe Dashboard
2. Check that webhook events are received
3. Verify database updates

## 🎨 Step 6: Customization

### 6.1 Plan Features

Edit the features in `scripts/seed-subscription-plans.js` to match your business needs.

### 6.2 Pricing

Update prices in the seed script and Stripe Dashboard.

### 6.3 Trial Period

Modify the trial period in `lib/stripe-subscription.ts`:

```typescript
// Change from 14 days to your preferred trial length
trialEnd.setDate(trialEnd.getDate() + 14);
```

## 🔍 Step 7: Monitoring

### 7.1 Stripe Dashboard

Monitor:
- Active subscriptions
- Failed payments
- Webhook delivery
- Customer portal usage

### 7.2 Application Logs

Check for:
- Webhook processing errors
- Subscription creation failures
- Payment method issues

## 🛠️ Troubleshooting

### Common Issues

1. **Webhook not receiving events**
   - Check webhook URL is correct
   - Verify webhook secret
   - Check server logs

2. **Subscription creation fails**
   - Verify Stripe price IDs
   - Check customer creation
   - Validate payment methods

3. **Customer portal not working**
   - Ensure customer has Stripe customer ID
   - Check portal configuration in Stripe

### Debug Commands

```bash
# Check webhook events
curl -X POST https://yourdomain.com/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Test subscription status
curl -X GET https://yourdomain.com/api/subscription/status \
  -H "Authorization: Bearer your_token"
```

## 📊 Step 8: Analytics

### 8.1 Track Key Metrics

- Subscription conversion rate
- Trial-to-paid conversion
- Churn rate
- Average revenue per user (ARPU)

### 8.2 Set Up Monitoring

- Stripe Dashboard alerts
- Application error tracking
- Database performance monitoring

## 🎉 Success!

Your subscription system is now ready! Detailers can:

✅ **Sign up for 14-day free trials**
✅ **Choose between Starter and Pro plans**
✅ **Manage their subscriptions via Stripe portal**
✅ **Receive automatic invoices via email**
✅ **Upgrade/downgrade their plans**
✅ **Get first cohort discounts**

## 📞 Support

For issues with:
- **Stripe integration**: Check Stripe documentation
- **Database issues**: Check Prisma logs
- **Webhook problems**: Verify endpoint configuration
- **Payment failures**: Check Stripe Dashboard

---

**Next Steps:**
1. Deploy to production
2. Set up monitoring
3. Train support team
4. Create user documentation
