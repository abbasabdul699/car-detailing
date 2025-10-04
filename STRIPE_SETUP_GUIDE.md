# 🔧 Stripe Configuration Guide

## **Step 1: Get Stripe API Keys**

1. **Go to [Stripe Dashboard](https://dashboard.stripe.com)**
2. **Navigate to Developers → API Keys**
3. **Copy your keys:**
   - **Secret Key**: `sk_live_...` or `sk_test_...`
   - **Publishable Key**: `pk_live_...` or `pk_test_...`

## **Step 2: Create Products in Stripe**

### **Product 1: Detailer Starter**
1. **Go to Products → Add Product**
2. **Product Details:**
   - Name: `Detailer Starter`
   - Description: `Pay-per-booking plan for detailers`
3. **Pricing:**
   - Model: `One-time`
   - Price: `$3.00`
   - Currency: `USD`
4. **Save and copy the Price ID** (starts with `price_`)

### **Product 2: Detailer Pro**
1. **Go to Products → Add Product**
2. **Product Details:**
   - Name: `Detailer Pro`
   - Description: `Monthly subscription for detailers`
3. **Pricing:**
   - Model: `Recurring`
   - Price: `$200.00`
   - Billing period: `Monthly`
   - Currency: `USD`
4. **Save and copy the Price ID** (starts with `price_`)

## **Step 3: Set Up Webhook**

1. **Go to Developers → Webhooks**
2. **Add endpoint:**
   - Endpoint URL: `https://yourdomain.com/api/webhooks/stripe`
   - Events to send:
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
3. **Copy the Webhook Signing Secret** (starts with `whsec_`)

## **Step 4: Update Environment Variables**

Add these to your `.env` file:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_your_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_live_your_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Stripe Price IDs (from Step 2)
STRIPE_STARTER_PRICE_ID=price_starter_from_stripe
STRIPE_PRO_PRICE_ID=price_pro_from_stripe

# Application URL
NEXTAUTH_URL=http://localhost:3000

# Cron Job Secret
CRON_SECRET=your_random_secret_here
```

## **Step 5: Update Database with Price IDs**

Run this command to update the database:

```bash
node scripts/update-stripe-prices.js
```

## **Step 6: Test the System**

1. **Visit**: `http://localhost:3000/detailer-dashboard/subscription`
2. **Login** as a detailer
3. **Test subscription creation**
4. **Verify Stripe Dashboard** shows the subscription

## **Step 7: Set Up Customer Portal (Optional)**

1. **Go to Settings → Billing → Customer Portal**
2. **Enable Customer Portal**
3. **Configure allowed actions:**
   - Update payment methods
   - View invoices
   - Cancel subscriptions

---

**🎉 Once completed, your subscription system will be fully operational!**
