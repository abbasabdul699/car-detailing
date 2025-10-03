const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateTwilioPhone() {
  try {
    // Update the detailer with the specific ID
    const updatedDetailer = await prisma.detailer.update({
      where: { id: '68dd945ae742f1523763b445' },
      data: { twilioPhoneNumber: '+16178827958' },
      select: {
        id: true,
        twilioPhoneNumber: true,
        personalPhoneNumber: true,
        businessName: true
      }
    });

    console.log('✅ Twilio phone number updated successfully:');
    console.log(updatedDetailer);
  } catch (error) {
    console.error('❌ Error updating Twilio phone number:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateTwilioPhone();
