#!/usr/bin/env node

/**
 * Test script for SMS webhook functionality
 * This script simulates incoming SMS messages to test the AI conversation flow
 */

const crypto = require('crypto');
const https = require('https');

// Configuration
const WEBHOOK_URL = process.env.APP_URL + '/api/webhooks/twilio';
const WEBHOOK_SECRET = process.env.TWILIO_WEBHOOK_AUTH_SECRET;
const TEST_PHONE = '+1234567890'; // Customer's phone number
const DETAILER_PHONE = '+1987654321'; // Detailer's Twilio phone number (replace with actual)

// Test messages to simulate conversation flow
const testMessages = [
  'Hi, I need car detailing',
  'Full detail please',
  'It\'s a Honda Civic sedan',
  'Tomorrow at 2pm',
  '2:00 PM'
];

function createSignature(body) {
  return crypto.createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex');
}

function sendTestMessage(message, messageIndex) {
  const formData = new URLSearchParams({
    From: TEST_PHONE,
    Body: message,
    MessageSid: `test_message_${Date.now()}_${messageIndex}`,
    AccountSid: 'test_account',
    To: DETAILER_PHONE
  });

  const body = formData.toString();
  const signature = createSignature(body);

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Twilio-Signature': signature,
      'Content-Length': Buffer.byteLength(body)
    }
  };

  console.log(`\n📱 Sending test message ${messageIndex + 1}: "${message}"`);
  console.log(`🔗 Webhook URL: ${WEBHOOK_URL}`);

  const req = https.request(WEBHOOK_URL, options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log(`✅ Response status: ${res.statusCode}`);
      console.log(`📄 Response body: ${data}`);
      
      // Send next message after a delay
      if (messageIndex < testMessages.length - 1) {
        setTimeout(() => {
          sendTestMessage(testMessages[messageIndex + 1], messageIndex + 1);
        }, 2000); // 2 second delay between messages
      } else {
        console.log('\n🎉 Test completed! Check your database for the conversation and booking.');
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Error sending test message:', error);
  });

  req.write(body);
  req.end();
}

// Main execution
console.log('🚀 Starting SMS webhook test...');
console.log('📋 Test messages:');
testMessages.forEach((msg, index) => {
  console.log(`   ${index + 1}. "${msg}"`);
});

// Check environment variables
if (!process.env.APP_URL || !process.env.TWILIO_WEBHOOK_AUTH_SECRET) {
  console.error('❌ Missing required environment variables:');
  console.error('   - APP_URL');
  console.error('   - TWILIO_WEBHOOK_AUTH_SECRET');
  process.exit(1);
}

console.log('📱 Test Configuration:');
console.log(`   Customer Phone: ${TEST_PHONE}`);
console.log(`   Detailer Phone: ${DETAILER_PHONE}`);
console.log(`   Webhook URL: ${WEBHOOK_URL}`);
console.log('');
console.log('⚠️  Make sure the detailer phone number exists in your database with SMS enabled!');

// Start the test
sendTestMessage(testMessages[0], 0);
