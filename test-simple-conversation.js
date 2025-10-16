// Simple test of conversation patterns without complex imports
console.log('🧪 Testing Conversation Patterns');
console.log('=================================');

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

// Test the updated regex pattern
const generalAvailabilityPattern = /(?:what\s+are.*(?:avai?lable|available|avaiable)\s+(?:times|dates|appointments)|(?:avai?lable|available|avaiable)\s+(?:times|dates|appointments)|do\s+you\s+have\s+any\s+openings|show\s+me\s+your\s+availability|what\s+(?:times|dates)\s+do\s+you\s+have|when\s+are\s+you\s+(?:avai?lable|available|avaiable)|yeah\s+what\s+are.*(?:avai?lable|available|avaiable)|what\s+services\s+do\s+you\s+provide)/i;

const serviceRequestPattern = /(?:what\s+services|services\s+do\s+you|what\s+do\s+you\s+offer|pricing|cost|price|how\s+much)/i;

const bookingRequestPattern = /(?:book|appointment|schedule|reserve|tomorrow|today|friday|monday|tuesday|wednesday|thursday|saturday|sunday|\d{1,2}:\d{2}|\d{1,2}\s*(am|pm))/i;

console.log('\n📝 Testing Conversation Patterns:');
console.log('===================================');

testCases.forEach((testCase, index) => {
  console.log(`\n${index + 1}. Testing: "${testCase.message}"`);
  console.log(`   Expected: ${testCase.expected}`);
  console.log(`   Description: ${testCase.description}`);
  
  const availabilityMatch = testCase.message.match(generalAvailabilityPattern);
  const serviceMatch = testCase.message.match(serviceRequestPattern);
  const bookingMatch = testCase.message.match(bookingRequestPattern);
  
  console.log(`   Availability: ${availabilityMatch ? '✅ MATCH' : '❌ NO MATCH'}`);
  console.log(`   Service: ${serviceMatch ? '✅ MATCH' : '❌ NO MATCH'}`);
  console.log(`   Booking: ${bookingMatch ? '✅ MATCH' : '❌ NO MATCH'}`);
  
  // Determine what response type would be triggered
  let responseType = 'Unknown';
  if (availabilityMatch) {
    responseType = 'Availability slots';
  } else if (serviceMatch) {
    responseType = 'Service information';
  } else if (bookingMatch) {
    responseType = 'Booking processing';
  } else {
    responseType = 'General conversation';
  }
  
  console.log(`   → Would trigger: ${responseType}`);
});

console.log('\n✅ Pattern testing completed');
console.log('\n📋 Summary:');
console.log('- Availability queries should show actual time slots');
console.log('- Service queries should list services and pricing');
console.log('- Booking queries should process appointment requests');
console.log('- The system handles common misspellings like "avaiable"');
