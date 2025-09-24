import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Test the Vapi integration
    const { searchParams } = new URL(request.url);
    const phoneNumber = searchParams.get('phone') || process.env.VAPI_PHONE_NUMBER;

    if (!phoneNumber) {
      return NextResponse.json({ 
        error: 'No phone number provided. Add ?phone=+1234567890 or set VAPI_PHONE_NUMBER env var' 
      }, { status: 400 });
    }

    // Find detailer by phone number
    const detailer = await prisma.detailer.findFirst({
      where: {
        twilioPhoneNumber: phoneNumber
      },
      select: {
        id: true,
        businessName: true,
        googleCalendarConnected: true,
        googleCalendarTokens: true,
        services: {
          include: {
            service: true
          }
        }
      }
    });

    if (!detailer) {
      return NextResponse.json({ 
        error: `No detailer found with phone number: ${phoneNumber}`,
        suggestion: 'Make sure the phone number matches your Vapi phone number'
      }, { status: 404 });
    }

    // Test availability API
    const testDate = new Date();
    testDate.setDate(testDate.getDate() + 1); // Tomorrow
    const testTime = '14:00'; // 2 PM

    let availabilityTest = null;
    try {
      const availabilityResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/vapi/availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          detailerId: detailer.id,
          date: testDate.toISOString().split('T')[0],
          time: testTime
        })
      });
      availabilityTest = await availabilityResponse.json();
    } catch (error) {
      availabilityTest = { error: 'Availability API failed', details: error.message };
    }

    // Test booking API
    let bookingTest = null;
    try {
      const bookingResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/vapi/booking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          detailerId: detailer.id,
          customerName: 'Test Customer',
          customerPhone: '+1234567890',
          vehicleMake: 'Toyota',
          vehicleModel: 'Camry',
          vehicleYear: '2020',
          services: ['Test Service'],
          scheduledDate: testDate.toISOString().split('T')[0],
          scheduledTime: testTime,
          address: 'Test Address'
        })
      });
      bookingTest = await bookingResponse.json();
    } catch (error) {
      bookingTest = { error: 'Booking API failed', details: error.message };
    }

    return NextResponse.json({
      success: true,
      detailer: {
        id: detailer.id,
        businessName: detailer.businessName,
        googleCalendarConnected: detailer.googleCalendarConnected,
        hasGoogleTokens: !!detailer.googleCalendarTokens,
        servicesCount: detailer.services.length,
        services: detailer.services.map(s => s.service.name)
      },
      tests: {
        availability: availabilityTest,
        booking: bookingTest
      },
      webhookUrl: `${process.env.NEXTAUTH_URL}/api/vapi/webhook`,
      environment: {
        vapiPhoneNumber: process.env.VAPI_PHONE_NUMBER,
        nextauthUrl: process.env.NEXTAUTH_URL
      }
    });

  } catch (error) {
    console.error('Vapi test error:', error);
    return NextResponse.json({ 
      error: 'Test failed', 
      details: error.message 
    }, { status: 500 });
  }
}
