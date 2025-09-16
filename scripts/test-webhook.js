#!/usr/bin/env node

/**
 * Test script to verify the webhook endpoint is working
 */

const https = require('https');

const WEBHOOK_URL = 'https://www.reevacar.com/api/webhooks/twilio';

function testWebhook() {
  console.log('🧪 Testing webhook endpoint...');
  console.log(`🔗 URL: ${WEBHOOK_URL}`);
  
  const options = {
    method: 'GET',
    timeout: 10000
  };

  const req = https.request(WEBHOOK_URL, options, (res) => {
    console.log(`✅ Webhook is accessible!`);
    console.log(`📊 Status: ${res.statusCode}`);
    console.log(`📋 Headers:`, res.headers);
    
    if (res.statusCode === 405) {
      console.log('✅ Perfect! 405 Method Not Allowed means the endpoint exists but only accepts POST (which is correct)');
    } else if (res.statusCode === 200) {
      console.log('✅ Webhook is responding!');
    } else {
      console.log(`⚠️  Unexpected status code: ${res.statusCode}`);
    }
  });

  req.on('error', (error) => {
    console.error('❌ Webhook test failed:', error.message);
    console.log('💡 Make sure:');
    console.log('   1. Your app is deployed to www.reevacar.com');
    console.log('   2. The webhook route exists at /api/webhooks/twilio');
    console.log('   3. Your domain is accessible');
  });

  req.on('timeout', () => {
    console.error('❌ Webhook test timed out');
    req.destroy();
  });

  req.end();
}

// Run the test
testWebhook();
