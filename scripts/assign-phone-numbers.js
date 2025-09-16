#!/usr/bin/env node

/**
 * Script to assign Twilio phone numbers to detailers
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Your phone numbers
const PHONE_NUMBERS = [
  {
    number: '+16178827958', // Local number
    detailerId: null // We'll assign this
  },
  {
    number: '+18338847958', // Toll-free number  
    detailerId: null // We'll assign this
  }
];

async function assignPhoneNumbers() {
  try {
    console.log('🔍 Fetching detailers...');
    
    // Get all detailers
    const detailers = await prisma.detailer.findMany({
      select: {
        id: true,
        businessName: true,
        email: true,
        twilioPhoneNumber: true,
        smsEnabled: true
      }
    });

    console.log(`📋 Found ${detailers.length} detailers:`);
    detailers.forEach((detailer, index) => {
      console.log(`${index + 1}. ${detailer.businessName} (${detailer.email})`);
      console.log(`   Current SMS: ${detailer.smsEnabled ? 'Enabled' : 'Disabled'}`);
      console.log(`   Current Phone: ${detailer.twilioPhoneNumber || 'None'}`);
      console.log('');
    });

    if (detailers.length === 0) {
      console.log('❌ No detailers found. Please add detailers first.');
      return;
    }

    // Assign phone numbers to first two detailers
    const detailersToUpdate = detailers.slice(0, 2);
    
    for (let i = 0; i < detailersToUpdate.length && i < PHONE_NUMBERS.length; i++) {
      const detailer = detailersToUpdate[i];
      const phoneNumber = PHONE_NUMBERS[i];
      
      console.log(`📞 Assigning ${phoneNumber.number} to ${detailer.businessName}...`);
      
      await prisma.detailer.update({
        where: { id: detailer.id },
        data: {
          twilioPhoneNumber: phoneNumber.number,
          smsEnabled: true
        }
      });
      
      console.log(`✅ Successfully assigned ${phoneNumber.number} to ${detailer.businessName}`);
    }

    console.log('\n🎉 Phone number assignment complete!');
    console.log('\n📋 Summary:');
    
    const updatedDetailers = await prisma.detailer.findMany({
      where: {
        twilioPhoneNumber: {
          not: null
        }
      },
      select: {
        businessName: true,
        twilioPhoneNumber: true,
        smsEnabled: true
      }
    });

    updatedDetailers.forEach(detailer => {
      console.log(`• ${detailer.businessName}: ${detailer.twilioPhoneNumber} (SMS: ${detailer.smsEnabled ? 'ON' : 'OFF'})`);
    });

  } catch (error) {
    console.error('❌ Error assigning phone numbers:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
assignPhoneNumbers();
