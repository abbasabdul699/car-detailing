#!/usr/bin/env node

/**
 * Test script to simulate SMS flow
 */

const https = require('https');

const WEBHOOK_URL = 'https://www.reevacar.com/api/webhooks/twilio';

// Test data - replace with actual detailer phone number
const TEST_DETAILER_PHONE = '+16178827958'; // Your local number
const TEST_CUSTOMER_PHONE = '+15551234567'; // Fake customer number

function testSMSFlow() {
  console.log('🧪 Testing SMS flow...');
  console.log(`📞 Detailer Phone: ${TEST_DETAILER_PHONE}`);
  console.log(`👤 Customer Phone: ${TEST_CUSTOMER_PHONE}`);
  console.log('');

  // Test messages
  const testMessages = [
    'Hello',
    'I need a car wash',
    'What are your prices?',
    'Can I book for tomorrow?'
  ];

  testMessages.forEach((message, index) => {
    setTimeout(() => {
      console.log(`📤 Sending test message ${index + 1}: "${message}"`);
      
      const formData = new URLSearchParams({
        From: TEST_CUSTOMER_PHONE,
        To: TEST_DETAILER_PHONE,
        Body: message
      });

      const formDataString = formData.toString();

      const options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(formDataString)
        }
      };

      const req = https.request(WEBHOOK_URL, options, (res) => {
        console.log(`📥 Response: ${res.statusCode}`);
        
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          console.log(`📋 Response body: ${data}`);
          console.log('---');
        });
      });

      req.on('error', (error) => {
        console.error(`❌ Error: ${error.message}`);
      });

      req.write(formDataString);
      req.end();
      
    }, index * 2000); // 2 second delay between messages
  });
}

// Run the test
testSMSFlow();
