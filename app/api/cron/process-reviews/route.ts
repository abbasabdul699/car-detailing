import { NextRequest, NextResponse } from 'next/server';
import { processScheduledReviews } from '@/lib/scheduledReviews';

export async function POST(request: NextRequest) {
  try {
    // Verify the cron secret for security
    const authHeader = request.headers.get('authorization');
    const url = new URL(request.url);
    const tokenParam = url.searchParams.get('token');
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret) {
      console.error('❌ CRON_SECRET environment variable not set');
      return NextResponse.json({ error: 'Cron secret not configured' }, { status: 500 });
    }
    
    if (authHeader !== `Bearer ${cronSecret}` && tokenParam !== cronSecret) {
      console.error('❌ Invalid cron secret provided');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔄 Processing scheduled review links...');
    
    // Process scheduled reviews
    await processScheduledReviews();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Scheduled review links processed successfully' 
    });
  } catch (error) {
    console.error('❌ Error processing scheduled reviews:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Allow GET for Vercel Cron compatibility (some environments send GET)
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const url = new URL(request.url);
    const tokenParam = url.searchParams.get('token');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.error('❌ CRON_SECRET environment variable not set');
      return NextResponse.json({ error: 'Cron secret not configured' }, { status: 500 });
    }

    if (authHeader !== `Bearer ${cronSecret}` && tokenParam !== cronSecret) {
      console.error('❌ Invalid cron secret provided');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔄 Processing scheduled review links (GET)...');
    await processScheduledReviews();
    return NextResponse.json({ success: true, message: 'Scheduled review links processed successfully' });
  } catch (error) {
    console.error('❌ Error processing scheduled reviews (GET):', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
