#!/usr/bin/env node

/**
 * Script to check webhook logs and test SMS flow
 */

console.log('🔍 Checking webhook status...');
console.log('');

console.log('📱 To test the webhook:');
console.log('1. Send an SMS from your phone to +16178827958');
console.log('2. The webhook should receive the message at: https://www.reevacar.com/api/test');
console.log('3. Check the response below');
console.log('');

console.log('🧪 Testing webhook endpoint...');

const https = require('https');

// Test the webhook endpoint
const testData = new URLSearchParams({
  From: '+15551234567',
  To: '+16178827958',
  Body: 'Test message from script',
  MessageSid: 'SM1234567890abcdef'
});

const options = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(testData.toString())
  }
};

const req = https.request('https://www.reevacar.com/api/test', options, (res) => {
  console.log(`📥 Webhook Response: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log(`📄 Response: ${data}`);
    
    if (res.statusCode === 200) {
      console.log('✅ Webhook is working!');
      console.log('');
      console.log('📱 Now try sending a real SMS to +16178827958');
      console.log('📱 You should receive a reply if the webhook is configured correctly');
    } else {
      console.log('❌ Webhook is not working properly');
    }
  });
});

req.on('error', (error) => {
  console.error(`❌ Error: ${error.message}`);
});

req.write(testData.toString());
req.end();
