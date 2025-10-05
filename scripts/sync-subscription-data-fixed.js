#!/usr/bin/env node

/**
 * Script to sync subscription data between Stripe and local database
 * This fixes mismatches where Stripe shows one plan but local DB shows another
 */

require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const Stripe = require('stripe');

const prisma = new PrismaClient();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

async function syncSubscriptionData() {
  try {
    console.log('🔄 Starting subscription data sync...\n');

    // Get all detailers with stripeCustomerId
    const detailers = await prisma.detailer.findMany({
      where: {
        stripeCustomerId: {
          not: null
        }
      },
      include: {
        subscription: {
          include: {
            plan: true
          }
        }
      }
    });

    console.log(`📋 Found ${detailers.length} detailers with Stripe customer IDs\n`);

    for (const detailer of detailers) {
      console.log(`👤 Processing: ${detailer.businessName} (${detailer.email})`);
      console.log(`   Stripe Customer ID: ${detailer.stripeCustomerId}`);
      
      if (detailer.subscription) {
        console.log(`   Local Plan: ${detailer.subscription.plan.name} (${detailer.subscription.plan.type})`);
        console.log(`   Local Status: ${detailer.subscription.status}`);
        console.log(`   Stripe Subscription ID: ${detailer.subscription.stripeSubscriptionId || 'None'}`);
      } else {
        console.log(`   Local Plan: No subscription found`);
      }

      try {
        // Get Stripe subscriptions for this customer
        const stripeSubscriptions = await stripe.subscriptions.list({
          customer: detailer.stripeCustomerId,
          status: 'all',
          limit: 10
        });

        console.log(`   Stripe Subscriptions: ${stripeSubscriptions.data.length} found`);

        if (stripeSubscriptions.data.length > 0) {
          // Get the most recent active subscription
          const activeSubscription = stripeSubscriptions.data.find(sub => 
            sub.status === 'active' || sub.status === 'trialing'
          ) || stripeSubscriptions.data[0];

          console.log(`   Active Stripe Plan: ${activeSubscription.id}`);
          console.log(`   Stripe Status: ${activeSubscription.status}`);

          // Get the price details
          const priceId = activeSubscription.items.data[0].price.id;
          const price = await stripe.prices.retrieve(priceId);
          const product = await stripe.products.retrieve(price.product);

          console.log(`   Stripe Product: ${product.name}`);
          console.log(`   Stripe Price: $${(price.unit_amount / 100).toFixed(2)}/${price.recurring?.interval || 'one-time'}`);

          // Find matching plan in database
          const matchingPlan = await prisma.subscriptionPlan.findFirst({
            where: {
              OR: [
                { stripePriceId: priceId },
                { 
                  name: product.name,
                  price: price.unit_amount / 100
                }
              ]
            }
          });

          if (matchingPlan) {
            console.log(`   ✅ Found matching plan: ${matchingPlan.name} (${matchingPlan.type})`);

            // Update or create subscription record
            if (detailer.subscription) {
              // Update existing subscription
              await prisma.subscription.update({
                where: { id: detailer.subscription.id },
                data: {
                  planId: matchingPlan.id,
                  status: activeSubscription.status === 'active' ? 'active' : 
                         activeSubscription.status === 'trialing' ? 'trial' : 'incomplete',
                  stripeSubscriptionId: activeSubscription.id,
                  currentPeriodStart: new Date(activeSubscription.current_period_start * 1000),
                  currentPeriodEnd: new Date(activeSubscription.current_period_end * 1000),
                  trialStart: activeSubscription.trial_start ? new Date(activeSubscription.trial_start * 1000) : null,
                  trialEnd: activeSubscription.trial_end ? new Date(activeSubscription.trial_end * 1000) : null,
                }
              });
              console.log(`   ✅ Updated existing subscription record`);
            } else {
              // Create new subscription record
              await prisma.subscription.create({
                data: {
                  detailerId: detailer.id,
                  planId: matchingPlan.id,
                  status: activeSubscription.status === 'active' ? 'active' : 
                         activeSubscription.status === 'trialing' ? 'trial' : 'incomplete',
                  stripeSubscriptionId: activeSubscription.id,
                  stripeCustomerId: detailer.stripeCustomerId,
                  currentPeriodStart: new Date(activeSubscription.current_period_start * 1000),
                  currentPeriodEnd: new Date(activeSubscription.current_period_end * 1000),
                  trialStart: activeSubscription.trial_start ? new Date(activeSubscription.trial_start * 1000) : null,
                  trialEnd: activeSubscription.trial_end ? new Date(activeSubscription.trial_end * 1000) : null,
                }
              });
              console.log(`   ✅ Created new subscription record`);
            }
          } else {
            console.log(`   ❌ No matching plan found in database for Stripe product: ${product.name}`);
          }
        } else {
          console.log(`   ⚠️  No Stripe subscriptions found for this customer`);
          
          // If there's a local subscription but no Stripe subscription, mark it as inactive
          if (detailer.subscription && detailer.subscription.stripeSubscriptionId) {
            await prisma.subscription.update({
              where: { id: detailer.subscription.id },
              data: { status: 'canceled' }
            });
            console.log(`   ✅ Marked local subscription as canceled (no Stripe subscription found)`);
          }
        }

      } catch (error) {
        console.error(`   ❌ Error processing Stripe data:`, error.message);
      }

      console.log(''); // Empty line for readability
    }

    console.log('✅ Subscription data sync completed!');
    
  } catch (error) {
    console.error('❌ Error syncing subscription data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the sync
syncSubscriptionData();
