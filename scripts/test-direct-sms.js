#!/usr/bin/env node

/**
 * Test script to send SMS directly via Twilio
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

if (!accountSid || !authToken) {
  console.error('❌ Missing Twilio credentials in .env.local');
  process.exit(1);
}

const client = twilio(accountSid, authToken);

async function testDirectSMS() {
  try {
    console.log('📱 Testing direct SMS via Twilio...');
    
    // Test sending SMS from your local number to a test number
    const message = await client.messages.create({
      body: 'Hello! This is a test SMS from Reeva Car AI system.',
      from: '+16178827958', // Your local Twilio number
      to: '+15551234567'    // Test number (this won't actually send to a real number)
    });

    console.log('✅ SMS sent successfully!');
    console.log(`📋 Message SID: ${message.sid}`);
    console.log(`📋 Status: ${message.status}`);
    
  } catch (error) {
    console.error('❌ Error sending SMS:', error.message);
    
    if (error.code === 21211) {
      console.log('💡 This error is expected - the test number is not a valid phone number');
      console.log('✅ Twilio credentials and phone number are working correctly!');
    }
  }
}

testDirectSMS();
