import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

export async function GET(request: NextRequest) {
  try {
    console.log('=== TWILIO TEST START ===');
    
    // Test Twilio client
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    
    // Test a simple Twilio operation
    const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
    
    console.log('Twilio test result:', 'Account found');
    
    return NextResponse.json({
      success: true,
      account: {
        sid: account.sid,
        friendlyName: account.friendlyName,
        status: account.status
      }
    });
    
  } catch (error) {
    console.error('=== TWILIO TEST ERROR ===');
    console.error('Error details:', error);
    
    return NextResponse.json({
      error: 'Twilio test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
