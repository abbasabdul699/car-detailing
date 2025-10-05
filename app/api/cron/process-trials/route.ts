import { NextRequest, NextResponse } from 'next/server';
import { trialManagementService } from '@/lib/trial-management';
import { trialNotificationService } from '@/lib/trial-notifications';

export async function POST(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔄 Starting trial management processing...');
    
    // Process expired trials
    await trialManagementService.processExpiredTrials();
    
    // Send trial reminders
    await trialManagementService.sendTrialReminders();
    
    // Create trial reminder notifications
    await trialNotificationService.createTrialReminderNotifications();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Trial management processing completed' 
    });
    
  } catch (error) {
    console.error('❌ Error processing trial management:', error);
    return NextResponse.json(
      { error: 'Failed to process trial management' },
      { status: 500 }
    );
  }
}
