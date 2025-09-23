const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testWebhook() {
  try {
    console.log('Testing webhook logic...');
    
    // Test the detailer lookup
    const detailer = await prisma.detailer.findFirst({
      where: {
        twilioPhoneNumber: '+15551234567',
        smsEnabled: true,
      },
      include: {
        services: {
          include: {
            service: true
          }
        }
      }
    });
    
    if (!detailer) {
      console.log('❌ No detailer found with Twilio phone number +15551234567');
      return;
    }
    
    console.log('✅ Detailer found:', detailer.businessName);
    console.log('Twilio Phone:', detailer.twilioPhoneNumber);
    console.log('SMS Enabled:', detailer.smsEnabled);
    
    // Test OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful AI assistant.' },
          { role: 'user', content: 'Hello, test message' }
        ],
        max_tokens: 50,
        temperature: 0.7,
      }),
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ OpenAI API working:', data.choices[0]?.message?.content);
    } else {
      console.log('❌ OpenAI API error:', response.status);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testWebhook();