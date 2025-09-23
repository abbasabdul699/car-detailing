import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    console.log('=== DATABASE TEST START ===');
    
    // Test database connection
    const detailer = await prisma.detailer.findFirst({
      where: {
        twilioPhoneNumber: '+16178827958',
        smsEnabled: true,
      },
    });
    
    console.log('Database test result:', detailer ? 'Detailer found' : 'No detailer found');
    
    return NextResponse.json({
      success: true,
      detailer: detailer ? {
        id: detailer.id,
        businessName: detailer.businessName,
        twilioPhoneNumber: detailer.twilioPhoneNumber,
        smsEnabled: detailer.smsEnabled
      } : null
    });
    
  } catch (error) {
    console.error('=== DATABASE TEST ERROR ===');
    console.error('Error details:', error);
    
    return NextResponse.json({
      error: 'Database test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
