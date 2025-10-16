const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Test phone number for simulation
const TEST_PHONE = '+15551234567';
const DETAILER_PHONE = '+16178827958';
const DETAILER_ID = '681bcef6a71960c3048e0db2';

async function simulateSMSWebhook(messageBody) {
  console.log(`\n📱 Customer: "${messageBody}"`);
  
  try {
    // Simulate the webhook call
    const response = await fetch('http://localhost:3000/api/webhooks/twilio/sms-fast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: TEST_PHONE,
        To: DETAILER_PHONE,
        Body: messageBody,
        MessageSid: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      })
    });
    
    if (response.ok) {
      console.log('✅ Webhook responded successfully');
    } else {
      console.log('❌ Webhook error:', response.status, await response.text());
    }
  } catch (error) {
    console.log('❌ Network error:', error.message);
  }
}

async function testConversationFlow() {
  console.log('🧪 Testing AI Conversation Flow');
  console.log('================================');
  
  // Clean up any existing test data
  await prisma.conversation.deleteMany({
    where: { customerPhone: TEST_PHONE }
  });
  await prisma.customerSnapshot.deleteMany({
    where: { customerPhone: TEST_PHONE }
  });
  await prisma.booking.deleteMany({
    where: { customerPhone: TEST_PHONE }
  });
  
  console.log('🧹 Cleaned up test data');
  
  // Test conversation flow
  const testMessages = [
    "Hey!",
    "What services do you have?",
    "What are your available times?",
    "What are some avaiable times?", // Test typo handling
    "How much does a full detail cost?",
    "What are your business hours?",
    "I want to book for tomorrow at 2pm",
    "Actually, can I get Friday at 3pm?",
    "Perfect, book it!",
    "What's included in the full detail?"
  ];
  
  for (const message of testMessages) {
    await simulateSMSWebhook(message);
    // Wait a bit between messages to simulate real conversation
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n✅ Conversation flow test completed');
}

// Check if we're running locally
async function checkLocalServer() {
  try {
    const response = await fetch('http://localhost:3000/api/health', { 
      method: 'GET',
      signal: AbortSignal.timeout(2000)
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function main() {
  console.log('🔍 Checking if local server is running...');
  
  const isServerRunning = await checkLocalServer();
  
  if (!isServerRunning) {
    console.log('❌ Local server not running. Please start with: npm run dev');
    console.log('   Then run this test again.');
    process.exit(1);
  }
  
  console.log('✅ Local server is running');
  await testConversationFlow();
  
  await prisma.$disconnect();
}

main().catch(console.error);
