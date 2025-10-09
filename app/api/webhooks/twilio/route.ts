import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCustomerSnapshot, upsertCustomerSnapshot, extractSnapshotHints } from '@/lib/customerSnapshot';
import { normalizeToE164 } from '@/lib/phone';
import { createCalendarEvent, syncToGoogleCalendar } from '@/lib/calendarSync';
import twilio from 'twilio';

export async function POST(request: NextRequest) {
  try {
    console.log('=== BASIC TWILIO WEBHOOK DISABLED ===');
    console.log('🚫 BASIC WEBHOOK DISABLED - Use sms-fast route instead');
    
    // This route is disabled to prevent duplicate processing
    // All SMS processing is now handled by /api/webhooks/twilio/sms-fast/route.ts
    return NextResponse.json({ 
      error: 'This webhook endpoint is disabled. Use /api/webhooks/twilio/sms-fast instead.',
      deprecated: true,
      redirect: '/api/webhooks/twilio/sms-fast'
    }, { status: 410 }); // 410 Gone - permanently unavailable
    
  } catch (error) {
    console.error('Twilio webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}