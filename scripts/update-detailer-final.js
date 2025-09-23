const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateDetailerFinal() {
  try {
    console.log('Updating detailer with REAL Twilio phone number...');
    
    // Update Brooks Car Care with the actual Twilio phone number
    const updatedDetailer = await prisma.detailer.update({
      where: { id: '681bcef6a71960c3048e0db2' },
      data: {
        twilioPhoneNumber: '+16178827958', // Your actual Twilio phone number
        smsEnabled: true
      }
    });
    
    console.log('✅ Detailer updated successfully:');
    console.log('Business Name:', updatedDetailer.businessName);
    console.log('Twilio Phone:', updatedDetailer.twilioPhoneNumber);
    console.log('SMS Enabled:', updatedDetailer.smsEnabled);
    
    console.log('\n📱 Next Steps:');
    console.log('1. Add these to your .env file:');
    console.log('   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
    console.log('   TWILIO_AUTH_TOKEN=your_auth_token_here');
    console.log('   TWILIO_MESSAGING_SERVICE_SID=MG1df10647df0120153ee51e7f6d090105');
    console.log('2. Update Twilio webhook URL to: https://www.reevacar.com/api/webhooks/twilio/sms-ai');
    console.log('3. Test by sending SMS to +16178827958');
    
  } catch (error) {
    console.error('❌ Error updating detailer:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateDetailerFinal();
