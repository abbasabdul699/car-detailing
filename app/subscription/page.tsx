'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const plans = [
  {
    name: 'Basic',
    price: 29.99,
    features: [
      'Profile listing',
      'Basic analytics',
      'Customer inquiries',
    ],
    priceId: 'price_XXXXX' // You'll get this from Stripe dashboard
  },
  {
    name: 'Pro',
    price: 49.99,
    features: [
      'Everything in Basic',
      'Featured listing',
      'Advanced analytics',
      'Priority support'
    ],
    priceId: 'price_YYYYY' // You'll get this from Stripe dashboard
  },
  {
    name: 'Premium',
    price: 99.99,
    features: [
      'Everything in Pro',
      'Top search placement',
      'Custom branding',
      'Dedicated account manager'
    ],
    priceId: 'price_ZZZZZ' // You'll get this from Stripe dashboard
  }
];

export default function SubscriptionPage() {
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async (priceId: string) => {
    try {
      setLoading(true);
      const stripe = await stripePromise;
      
      // Create checkout session
      const response = await fetch('/api/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ priceId }),
      });
      
      const { sessionId } = await response.json();
      
      // Redirect to checkout
      const result = await stripe?.redirectToCheckout({
        sessionId,
      });
      
      if (result?.error) {
        throw new Error(result.error.message);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Choose Your Subscription Plan
          </h2>
          <p className="mt-4 text-xl text-gray-600">
            Select the plan that best fits your business needs
          </p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className="bg-white rounded-lg shadow-lg overflow-hidden"
            >
              <div className="px-6 py-8">
                <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                <p className="mt-4 text-4xl font-extrabold text-gray-900">
                  ${plan.price}
                  <span className="text-base font-medium text-gray-500">/month</span>
                </p>
                <ul className="mt-6 space-y-4">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center">
                      <svg
                        className="h-5 w-5 text-green-500"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="ml-3 text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleSubscribe(plan.priceId)}
                  disabled={loading}
                  className="mt-8 w-full bg-[#0A2217] text-white rounded-md py-2 px-4 hover:bg-[#0A2217]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0A2217] disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Subscribe Now'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 