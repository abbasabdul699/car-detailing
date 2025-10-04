# First Cohort Promotion Setup Guide

## 🎯 Overview

The first 10 detailers who join ReevaCar will receive a **15% permanent discount** on the Detailer Pro plan ($300/month → $255/month).

## 🚀 How It Works

### Automatic Discount Application
- When a detailer with `isFirstCohort: true` subscribes to the Detailer Pro plan
- The system automatically applies a 15% discount using a Stripe coupon
- The discount is permanent (forever) - not just for the first month

### Current Status
- **Total Detailers**: 2
- **First Cohort Members**: 2 (Brooks Car Care, Spade Detailing)
- **Remaining Slots**: 8

## 🔧 Setup Steps

### 1. Create Stripe Coupon
1. Go to **Stripe Dashboard** → **Products** → **Coupons**
2. Click **"Create coupon"**
3. Configure:
   - **Name**: `First Cohort 15% Discount`
   - **Type**: `Percentage`
   - **Value**: `15`
   - **Duration**: `Forever`
   - **Redemption limit**: `10` (optional, for safety)

### 2. Get Coupon ID
1. After creating the coupon, copy the **Coupon ID**
2. Add to your `.env.local`:
   ```bash
   STRIPE_FIRST_COHORT_COUPON_ID=your_coupon_id_here
   ```

### 3. Mark Detailers as First Cohort
```bash
# Check current status
node scripts/check-first-cohort.js

# Add more detailers to first cohort (if needed)
node scripts/setup-first-cohort.js
```

## 📊 Management Scripts

### Check First Cohort Status
```bash
node scripts/check-first-cohort.js
```
Shows:
- Total detailers
- First cohort members
- Remaining slots
- Benefits explanation

### Add More First Cohort Members
```bash
node scripts/setup-first-cohort.js
```
Automatically marks the next available detailers as first cohort.

## 🎯 How the Discount Works

### For Detailers
1. **Sign up** for ReevaCar
2. **Get marked** as first cohort (if within first 10)
3. **Subscribe** to Detailer Pro plan
4. **Automatic 15% discount** applied ($300 → $255/month)
5. **Discount is permanent** - lasts forever

### For You (Admin)
1. **Monitor** first cohort status with scripts
2. **Automatic application** - no manual intervention needed
3. **Track** who gets the discount in Stripe dashboard

## 🔍 Verification

### Check if Discount is Applied
1. Go to **Stripe Dashboard** → **Customers**
2. Find the detailer's customer record
3. Check their **subscription** - should show discount applied
4. **Invoice** will show the reduced amount

### Database Check
```sql
-- Check first cohort members
SELECT businessName, email, isFirstCohort, createdAt 
FROM Detailer 
WHERE isFirstCohort = true 
ORDER BY createdAt ASC;
```

## 🚨 Important Notes

- **Only first 10 detailers** get the discount
- **Discount is automatic** - no manual intervention needed
- **Discount is permanent** - lasts for the lifetime of their subscription
- **Only applies to Detailer Pro plan** ($300/month)
- **Starter plan** ($3 per booking) is not affected

## 🎉 Success!

When everything is set up correctly:
- ✅ First cohort detailers get 15% off automatically
- ✅ Discount shows in Stripe dashboard
- ✅ Invoices reflect the reduced amount
- ✅ System tracks who gets the discount

## 📞 Support

If you need to manually add/remove first cohort members:
1. Update the `isFirstCohort` field in the database
2. Or use the management scripts provided
