import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { detailerId } = await request.json();
    
    // Generate a visitor ID if it doesn't exist
    const cookieStore = cookies();
    const visitorId = cookieStore.get('visitor_id')?.value || 
      Math.random().toString(36).substring(7);

    // Create the page visit record
    await prisma.pageVisit.create({
      data: {
        detailerId,
        pageType: 'profile',
        visitorId,
        timestamp: new Date()
      }
    });

    // Set the visitor cookie if it doesn't exist
    const response = NextResponse.json({ success: true });
    if (!cookieStore.get('visitor_id')) {
      response.cookies.set('visitor_id', visitorId, {
        maxAge: 60 * 60 * 24 * 365, // 1 year
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
      });
    }

    return response;
  } catch (error) {
    console.error('Failed to track visit:', error);
    return NextResponse.json(
      { error: 'Failed to track visit' },
      { status: 500 }
    );
  }
} 