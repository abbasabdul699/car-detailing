const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Test phone number for simulation
const TEST_PHONE = '+15551234567';
const DETAILER_PHONE = '+16178827958';
const DETAILER_ID = '681bcef6a71960c3048e0db2';

async function simulateSMSWebhook(messageBody, messageSid) {
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
        MessageSid: messageSid
      })
    });
    
    if (response.ok) {
      const responseText = await response.text();
      console.log('✅ Webhook responded successfully');
      console.log('📤 Response:', responseText.substring(0, 200) + (responseText.length > 200 ? '...' : ''));
    } else {
      const errorText = await response.text();
      console.log('❌ Webhook error:', response.status, errorText.substring(0, 200));
    }
  } catch (error) {
    console.log('❌ Network error:', error.message);
  }
}

async function testFullConversationFlow() {
  console.log('🧪 Testing Full AI Conversation Flow');
  console.log('====================================');
  
  // Clean up any existing test data
  console.log('🧹 Cleaning up test data...');
  await prisma.conversation.deleteMany({
    where: { customerPhone: TEST_PHONE }
  });
  await prisma.customerSnapshot.deleteMany({
    where: { customerPhone: TEST_PHONE }
  });
  await prisma.booking.deleteMany({
    where: { customerPhone: TEST_PHONE }
  });
  await prisma.message.deleteMany({
    where: { 
      conversation: {
        customerPhone: TEST_PHONE
      }
    }
  });
  
  console.log('✅ Test data cleaned up');
  
  // Test conversation flow
  const testMessages = [
    { message: "Hey!", description: "Initial greeting" },
    { message: "What services do you have?", description: "Service inquiry" },
    { message: "What are your available times?", description: "Availability query (correct spelling)" },
    { message: "What are some avaiable times?", description: "Availability query (with typo)" },
    { message: "How much does a full detail cost?", description: "Pricing inquiry" },
    { message: "What are your business hours?", description: "Business hours inquiry" },
    { message: "I want to book for tomorrow at 2pm", description: "Booking request" },
    { message: "Actually, can I get Friday at 3pm?", description: "Booking change" },
    { message: "Perfect, book it!", description: "Booking confirmation" },
    { message: "What's included in the full detail?", description: "Service details" }
  ];
  
  console.log('\n🔄 Starting conversation flow test...');
  
  for (let i = 0; i < testMessages.length; i++) {
    const { message, description } = testMessages[i];
    const messageSid = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`\n--- Step ${i + 1}: ${description} ---`);
    await simulateSMSWebhook(message, messageSid);
    
    // Wait between messages to simulate real conversation
    console.log('⏳ Waiting 3 seconds...');
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  console.log('\n✅ Full conversation flow test completed');
  
  // Check what data was created
  console.log('\n📊 Checking created data...');
  
  const conversations = await prisma.conversation.findMany({
    where: { customerPhone: TEST_PHONE },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
        take: 5
      }
    }
  });
  
  console.log(`📞 Conversations created: ${conversations.length}`);
  
  const snapshots = await prisma.customerSnapshot.findMany({
    where: { customerPhone: TEST_PHONE }
  });
  
  console.log(`👤 Customer snapshots created: ${snapshots.length}`);
  
  const bookings = await prisma.booking.findMany({
    where: { customerPhone: TEST_PHONE }
  });
  
  console.log(`📅 Bookings created: ${bookings.length}`);
  
  if (conversations.length > 0) {
    console.log('\n💬 Sample conversation messages:');
    conversations[0].messages.forEach((msg, i) => {
      const direction = msg.direction === 'inbound' ? '📱 Customer' : '🤖 AI';
      console.log(`   ${i + 1}. ${direction}: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`);
    });
  }
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
    console.log('❌ Local server not running.');
    console.log('   Please start with: npm run dev');
    console.log('   Then run this test again.');
    console.log('\n   Or run the pattern test instead:');
    console.log('   node test-simple-conversation.js');
    process.exit(1);
  }
  
  console.log('✅ Local server is running');
  await testFullConversationFlow();
  
  await prisma.$disconnect();
}

main().catch(console.error);
