const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Test the conversation state logic directly
async function testConversationLogic() {
  console.log('🧪 Testing Conversation State Logic');
  console.log('===================================');
  
  const testCases = [
    {
      message: "Hey!",
      expected: "Should greet and ask for service/date",
      description: "Initial greeting"
    },
    {
      message: "What services do you have?",
      expected: "Should list available services",
      description: "Service inquiry"
    },
    {
      message: "What are your available times?",
      expected: "Should show available slots",
      description: "Availability query (correct spelling)"
    },
    {
      message: "What are some avaiable times?",
      expected: "Should show available slots (handle typo)",
      description: "Availability query (with typo)"
    },
    {
      message: "Do you have any openings?",
      expected: "Should show available slots",
      description: "Alternative availability query"
    },
    {
      message: "What are your business hours?",
      expected: "Should show business hours",
      description: "Business hours inquiry"
    },
    {
      message: "How much does a full detail cost?",
      expected: "Should provide pricing information",
      description: "Pricing inquiry"
    },
    {
      message: "I want to book for tomorrow at 2pm",
      expected: "Should process booking request",
      description: "Booking request"
    },
    {
      message: "Friday at 3pm works",
      expected: "Should confirm booking",
      description: "Booking confirmation"
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n📝 Testing: "${testCase.message}"`);
    console.log(`   Expected: ${testCase.expected}`);
    console.log(`   Description: ${testCase.description}`);
    
    // Test the regex patterns
    const generalAvailabilityQueryMatch = testCase.message.match(/(?:what\s+are.*avai?lable\s+(?:times|dates|appointments)|avai?lable\s+(?:times|dates|appointments)|do\s+you\s+have\s+any\s+openings|show\s+me\s+your\s+availability|what\s+(?:times|dates)\s+do\s+you\s+have|when\s+are\s+you\s+avai?lable|yeah\s+what\s+are.*avai?lable|what\s+services\s+do\s+you\s+provide)/i);
    
    if (generalAvailabilityQueryMatch) {
      console.log('   ✅ Would trigger availability response');
    } else {
      console.log('   ❌ Would not trigger availability response');
    }
    
    // Test service request pattern
    const serviceRequestMatch = testCase.message.match(/(?:what\s+services|services\s+do\s+you|what\s+do\s+you\s+offer|pricing|cost|price|how\s+much)/i);
    
    if (serviceRequestMatch) {
      console.log('   ✅ Would trigger service response');
    }
    
    // Test booking request pattern
    const bookingRequestMatch = testCase.message.match(/(?:book|appointment|schedule|reserve|tomorrow|today|friday|monday|tuesday|wednesday|thursday|saturday|sunday|\d{1,2}:\d{2}|\d{1,2}\s*(am|pm))/i);
    
    if (bookingRequestMatch) {
      console.log('   ✅ Would trigger booking response');
    }
  }
  
  console.log('\n✅ Conversation logic test completed');
}

async function testAvailabilityComputation() {
  console.log('\n🧪 Testing Availability Computation');
  console.log('===================================');
  
  try {
    // Test if we can compute availability
    const { getMergedFreeSlots } = await import('./lib/slotComputationV2.ts');
    
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    
    console.log(`📅 Testing availability for: ${dateStr}`);
    
    // Get detailer info
    const detailer = await prisma.detailer.findFirst({
      where: { smsEnabled: true },
      select: {
        id: true,
        businessName: true,
        timezone: true,
        businessHours: true
      }
    });
    
    if (!detailer) {
      console.log('❌ No SMS-enabled detailer found');
      return;
    }
    
    console.log(`🏢 Detailer: ${detailer.businessName}`);
    console.log(`🕐 Timezone: ${detailer.timezone}`);
    console.log(`⏰ Business Hours: ${detailer.businessHours ? 'Configured' : 'Not configured'}`);
    
    // Test availability computation
    const slots = await getMergedFreeSlots(
      dateStr,
      'primary', // Google Calendar ID
      [], // Reeva busy intervals
      detailer.id,
      120, // slot duration
      30, // buffer
      detailer.timezone || 'America/New_York'
    );
    
    console.log(`📋 Generated ${slots.length} available slots`);
    
    if (slots.length > 0) {
      console.log('   First 3 slots:');
      slots.slice(0, 3).forEach((slot, i) => {
        console.log(`   ${i + 1}. ${slot.startLocal} - ${slot.endLocal}`);
      });
    }
    
  } catch (error) {
    console.log('❌ Error testing availability:', error.message);
  }
}

async function main() {
  await testConversationLogic();
  await testAvailabilityComputation();
  
  await prisma.$disconnect();
}

main().catch(console.error);
