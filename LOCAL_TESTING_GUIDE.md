# 🧪 Local Testing Guide for Subscription System

## **Quick Start - Test Before Deploying**

### **1. Start Local Development Server**
```bash
npm run dev
```
Server will run at: `http://localhost:3000`

### **2. Test the Complete Flow**

#### **Step 1: Login as Detailer**
1. Go to: `http://localhost:3000/detailer-login`
2. Login with: `spadedetailingcars@gmail.com` (has Stripe customer ID)
3. Or: `test-detailer-trial@example.com` (fresh account)

#### **Step 2: Test Subscription Selection**
1. Navigate to: `http://localhost:3000/detailer-dashboard/subscription`
2. You should see the plan selection modal
3. Click **"Choose Detailer Starter"** (pay-per-booking)
4. Click **"Choose Detailer Pro"** (monthly subscription)

#### **Step 3: Verify Results**
Check the database to see if subscriptions were created:
```bash
node scripts/test-local-subscription.js
```

### **3. Test Different Scenarios**

#### **Scenario A: Pay-Per-Booking (Detailer Starter)**
- ✅ Should create database subscription record
- ✅ No Stripe subscription created
- ✅ Status: "active" immediately
- ✅ No trial period

#### **Scenario B: Monthly Subscription (Detailer Pro)**
- ✅ Should create Stripe subscription
- ✅ 14-day trial period
- ✅ First cohort gets 15% discount
- ✅ Full Stripe integration

#### **Scenario C: Trial Period**
- ✅ Detailers in trial should see plan selection modal
- ✅ No charges during trial
- ✅ Trial reminders in notifications

### **4. Debug Common Issues**

#### **Issue: "Choose Detailer Starter" does nothing**
**Check:** Browser console for errors
**Fix:** Ensure local server is running

#### **Issue: 401 Unauthorized**
**Check:** User is logged in as detailer
**Fix:** Login at `/detailer-login` first

#### **Issue: Stripe errors**
**Check:** Environment variables are set
**Fix:** Verify `.env.local` has correct Stripe keys

### **5. Database Verification**

#### **Check Subscriptions:**
```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.subscription.findMany({
  include: { plan: true, detailer: { select: { businessName: true } } }
}).then(subs => {
  console.log('📊 Current Subscriptions:');
  subs.forEach(sub => {
    console.log(\`- \${sub.detailer.businessName}: \${sub.plan.name} (\${sub.status})\`);
  });
  prisma.\$disconnect();
});
"
```

#### **Check Trial Status:**
```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.detailer.findMany({
  select: { businessName: true, trialEndsAt: true, isFirstCohort: true }
}).then(detailers => {
  console.log('🕒 Trial Status:');
  detailers.forEach(d => {
    console.log(\`- \${d.businessName}: \${d.trialEndsAt || 'No trial'} (First cohort: \${d.isFirstCohort})\`);
  });
  prisma.\$disconnect();
});
"
```

### **6. Test API Endpoints Directly**

#### **Test Plans API:**
```bash
curl http://localhost:3000/api/subscription/plans | jq
```

#### **Test Status API:**
```bash
curl http://localhost:3000/api/subscription/status | jq
```

#### **Test Create Subscription (will fail without auth):**
```bash
curl -X POST http://localhost:3000/api/subscription/create \
  -H "Content-Type: application/json" \
  -d '{"planId": "68e194b627af644e508933d9"}'
```

### **7. Environment Variables for Local Testing**

Make sure `.env.local` has:
```env
# Stripe (use test keys for local testing)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_FIRST_COHORT_COUPON_ID=your_coupon_id

# Database
DATABASE_URL=mongodb://...

# Email (optional for local testing)
EMAIL_FROM=noreply@reevacar.com
```

### **8. Clean Up After Testing**

#### **Reset Test Data:**
```bash
# Delete test subscriptions
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.subscription.deleteMany({
  where: { detailer: { email: { contains: 'test' } } }
}).then(() => {
  console.log('✅ Test subscriptions deleted');
  prisma.\$disconnect();
});
"
```

### **9. Pre-Deployment Checklist**

Before pushing to Vercel, verify:
- [ ] ✅ Local server runs without errors
- [ ] ✅ Plan selection modal appears
- [ ] ✅ "Choose Detailer Starter" works (creates DB record)
- [ ] ✅ "Choose Detailer Pro" works (creates Stripe subscription)
- [ ] ✅ No console errors in browser
- [ ] ✅ Database records created correctly
- [ ] ✅ Environment variables are set

### **10. Deployment Commands**

Only after local testing passes:
```bash
git add .
git commit -m "feat: Add subscription system with local testing"
git push origin main
```

## **🎯 Benefits of Local Testing**

1. **⚡ Faster iteration** - No deployment wait time
2. **🐛 Easier debugging** - Direct access to logs and database
3. **💰 Cost effective** - No Vercel function invocations
4. **🔒 Safe testing** - No impact on production data
5. **📊 Better visibility** - See exactly what's happening

## **🚀 Happy Testing!**

Test locally first, then deploy with confidence! 🎉
