import { NextRequest, NextResponse } from 'next/server';
import { bookingCompletionService } from '@/lib/booking-completion';

export async function POST(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request (add your own verification)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔄 Starting booking completion processing...');
    
    // Process all completed bookings
    await bookingCompletionService.processCompletedBookings();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Booking completion processing completed' 
    });
    
  } catch (error) {
    console.error('❌ Error processing booking completions:', error);
    return NextResponse.json(
      { error: 'Failed to process booking completions' },
      { status: 500 }
    );
  }
}
