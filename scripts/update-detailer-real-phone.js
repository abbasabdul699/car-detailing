const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateDetailerWithRealPhone() {
  try {
    console.log('Updating detailer with REAL Twilio phone number...');
    console.log('⚠️  IMPORTANT: Replace +15551234567 with your actual Twilio phone number');
    
    // Update Brooks Car Care with REAL Twilio phone number
    // Replace +15551234567 with your actual Twilio phone number from Twilio Console
    const updatedDetailer = await prisma.detailer.update({
      where: { id: '681bcef6a71960c3048e0db2' },
      data: {
        twilioPhoneNumber: '+15551234567', // ⚠️ REPLACE THIS WITH YOUR REAL TWILIO PHONE NUMBER
        smsEnabled: true
      }
    });
    
    console.log('✅ Detailer updated successfully:');
    console.log('Business Name:', updatedDetailer.businessName);
    console.log('Twilio Phone:', updatedDetailer.twilioPhoneNumber);
    console.log('SMS Enabled:', updatedDetailer.smsEnabled);
    
    console.log('\n📱 Next Steps:');
    console.log('1. Update your .env file with real Twilio credentials');
    console.log('2. Replace +15551234567 with your actual Twilio phone number');
    console.log('3. Update Twilio webhook URL to: https://www.reevacar.com/api/webhooks/twilio/sms-ai');
    console.log('4. Test by sending SMS to your Twilio phone number');
    
  } catch (error) {
    console.error('❌ Error updating detailer:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateDetailerWithRealPhone();
