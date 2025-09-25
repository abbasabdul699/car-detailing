import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    console.log('=== TESTING DATABASE CONNECTION ===');
    
    // Test basic database connection
    const detailer = await prisma.detailer.findUnique({
      where: { id: "681bcef6a71960c3048e0db2" },
      select: {
        id: true,
        businessName: true,
        businessHours: true
      }
    });
    
    console.log('Detailer found:', detailer);
    
    return NextResponse.json({
      success: true,
      detailer: detailer,
      message: 'Database connection working'
    });
    
  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack'
    }, { status: 500 });
  }
}
