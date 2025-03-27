import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  return NextResponse.json({ error: 'Subscription service temporarily unavailable' }, { status: 503 });
} 