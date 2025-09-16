#!/usr/bin/env node

/**
 * Script to set up detailer phone numbers in the database
 * This script helps you assign Twilio phone numbers to your detailers
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Your Twilio phone numbers
const PHONE_NUMBERS = [
  {
    number: '+16178827958', // Local number (Newton, MA)
    description: 'Local number - Newton, MA'
  },
  {
    number: '+18442849566', // Toll-free number (needs verification fix)
    description: 'Toll-free number (verification needed)'
  }
];

async function listDetailers() {
  console.log('📋 Current Detailers:');
  console.log('====================');
  
  try {
    const detailers = await prisma.detailer.findMany({
      select: {
        id: true,
        businessName: true,
        email: true,
        twilioPhoneNumber: true,
        smsEnabled: true
      },
      orderBy: { businessName: 'asc' }
    });

    if (detailers.length === 0) {
      console.log('❌ No detailers found in database.');
      console.log('   Please add some detailers first through your admin panel.');
      return [];
    }

    detailers.forEach((detailer, index) => {
      console.log(`${index + 1}. ${detailer.businessName}`);
      console.log(`   Email: ${detailer.email}`);
      console.log(`   Twilio Phone: ${detailer.twilioPhoneNumber || 'Not set'}`);
      console.log(`   SMS Enabled: ${detailer.smsEnabled ? '✅ Yes' : '❌ No'}`);
      console.log('');
    });

    return detailers;
  } catch (error) {
    console.error('❌ Error fetching detailers:', error.message);
    return [];
  }
}

async function assignPhoneNumber(detailerId, phoneNumber) {
  try {
    const updatedDetailer = await prisma.detailer.update({
      where: { id: detailerId },
      data: {
        twilioPhoneNumber: phoneNumber,
        smsEnabled: true
      },
      select: {
        businessName: true,
        twilioPhoneNumber: true,
        smsEnabled: true
      }
    });

    console.log(`✅ Successfully assigned ${phoneNumber} to ${updatedDetailer.businessName}`);
    return true;
  } catch (error) {
    console.error(`❌ Error assigning phone number:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Detailer Phone Number Setup');
  console.log('==============================\n');

  // List available phone numbers
  console.log('📱 Available Twilio Phone Numbers:');
  PHONE_NUMBERS.forEach((phone, index) => {
    console.log(`${index + 1}. ${phone.number} - ${phone.description}`);
  });
  console.log('');

  // List current detailers
  const detailers = await listDetailers();
  
  if (detailers.length === 0) {
    process.exit(1);
  }

  console.log('🔧 Phone Number Assignment:');
  console.log('===========================');
  console.log('You can assign phone numbers to detailers using this script.');
  console.log('Or use the admin interface at /admin/sms-settings\n');

  // Interactive assignment
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (query) => new Promise((resolve) => rl.question(query, resolve));

  try {
    for (let i = 0; i < Math.min(detailers.length, PHONE_NUMBERS.length); i++) {
      const detailer = detailers[i];
      const phone = PHONE_NUMBERS[i];
      
      const answer = await question(
        `Assign ${phone.number} to ${detailer.businessName}? (y/n): `
      );
      
      if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        await assignPhoneNumber(detailer.id, phone.number);
      } else {
        console.log(`⏭️  Skipped ${detailer.businessName}`);
      }
      console.log('');
    }

    console.log('🎉 Setup complete!');
    console.log('\n📋 Next steps:');
    console.log('1. Configure webhook URLs in Twilio Console for each number');
    console.log('2. Resolve toll-free verification for +1 844 284 9566');
    console.log('3. Test SMS functionality with each detailer');
    console.log('4. Use /admin/sms-settings to manage phone numbers');

  } catch (error) {
    console.error('❌ Error during setup:', error.message);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

// Check if running directly
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { listDetailers, assignPhoneNumber };

