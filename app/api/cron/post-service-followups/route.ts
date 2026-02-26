import { NextRequest, NextResponse } from 'next/server';
import { processPostServiceFollowups } from '@/lib/postServiceFollowups';

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const url = new URL(request.url);
  const tokenParam = url.searchParams.get('token');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) return false;
  return authHeader === `Bearer ${cronSecret}` || tokenParam === cronSecret;
}

async function handleCron(request: NextRequest) {
  if (!process.env.CRON_SECRET) {
    console.error('❌ CRON_SECRET environment variable not set');
    return NextResponse.json({ error: 'Cron secret not configured' }, { status: 500 });
  }

  if (!isAuthorized(request)) {
    console.error('❌ Unauthorized post-service followups cron request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await processPostServiceFollowups();
  return NextResponse.json({ success: true, message: 'Post-service followups processed successfully' });
}

export async function POST(request: NextRequest) {
  try {
    return await handleCron(request);
  } catch (error) {
    console.error('❌ Error processing post-service followups (POST):', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    return await handleCron(request);
  } catch (error) {
    console.error('❌ Error processing post-service followups (GET):', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
