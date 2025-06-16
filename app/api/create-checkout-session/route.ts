import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-08-16' });

export async function POST(request: Request) {
  const { amount, bookingId } = await request.json();
  // Validate bookingId and amount

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: 'Car Detailing Deposit' },
        unit_amount: Math.round(Number(amount) * 100), // in cents
      },
      quantity: 1,
    }],
    mode: 'payment',
    success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/book/${bookingId}/success`,
    cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/book/${bookingId}/cancel`,
    metadata: { bookingId },
  });

  return NextResponse.json({ url: session.url });
}
