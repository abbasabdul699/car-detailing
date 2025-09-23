const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateDetailerTwilio() {
  try {
    console.log('Updating detailer with Twilio phone number...');
    
    // Update Brooks Car Care with Twilio phone number
    const updatedDetailer = await prisma.detailer.update({
      where: { id: '681bcef6a71960c3048e0db2' },
      data: {
        twilioPhoneNumber: '+15551234567', // Replace with your actual Twilio phone number
        smsEnabled: true
      }
    });
    
    console.log('✅ Detailer updated successfully:');
    console.log('Business Name:', updatedDetailer.businessName);
    console.log('Twilio Phone:', updatedDetailer.twilioPhoneNumber);
    console.log('SMS Enabled:', updatedDetailer.smsEnabled);
    
  } catch (error) {
    console.error('❌ Error updating detailer:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateDetailerTwilio();
