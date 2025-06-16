'use client';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function CheckoutPage({ params }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('bookingId');
  const depositAmount = searchParams.get('deposit'); // e.g. 50

  useEffect(() => {
    // Call your API to create a Stripe Checkout Session
    async function createSession() {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, amount: depositAmount }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url; // Redirect to Stripe Checkout
      }
    }
    createSession();
  }, [bookingId, depositAmount]);

  return <div>Redirecting to payment...</div>;
}