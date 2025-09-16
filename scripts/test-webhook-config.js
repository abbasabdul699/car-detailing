#!/usr/bin/env node

/**
 * Test script to verify webhook configuration
 */

const https = require('https');

const WEBHOOK_URL = 'https://www.reevacar.com/api/webhooks/twilio';

function testWebhook() {
  console.log('🧪 Testing webhook configuration...');
  console.log(`📡 Webhook URL: ${WEBHOOK_URL}`);
  console.log('');

  // Test data simulating a real Twilio webhook
  const testData = new URLSearchParams({
    From: '+15551234567',        // Customer's phone number
    To: '+16178827958',          // Your Twilio number
    Body: 'Hello, I need a car wash',
    MessageSid: 'SM1234567890abcdef',
    AccountSid: 'AC1234567890abcdef',
    ApiVersion: '2010-04-01'
  });

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(testData.toString()),
      'User-Agent': 'TwilioProxy/1.1'
    }
  };

  console.log('📤 Sending test webhook...');
  
  const req = https.request(WEBHOOK_URL, options, (res) => {
    console.log(`📥 Response Status: ${res.statusCode}`);
    console.log(`📋 Response Headers:`, res.headers);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log(`📄 Response Body: ${data}`);
      
      if (res.statusCode === 200) {
        console.log('✅ Webhook is working!');
      } else {
        console.log('❌ Webhook returned an error');
      }
    });
  });

  req.on('error', (error) => {
    console.error(`❌ Request Error: ${error.message}`);
  });

  req.write(testData.toString());
  req.end();
}

testWebhook();
