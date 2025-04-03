import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const reviews = await prisma.review.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });
    return NextResponse.json({ success: true, data: reviews });
  } catch (error) {
    console.error('GET Reviews Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch reviews' 
    }, { 
      status: 500 
    });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.name || !data.rating || !data.review || !data.type) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields' 
      }, { 
        status: 400 
      });
    }

    const review = await prisma.review.create({
      data: {
        name: data.name,
        rating: data.rating,
        review: data.review,
        type: data.type,
        verified: false,
        serviceType: data.serviceType || null,
        businessLocation: data.businessLocation || null,
      }
    });

    return NextResponse.json({ 
      success: true, 
      data: review 
    }, { 
      status: 201 
    });
  } catch (error) {
    console.error('POST Review Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to create review' 
    }, { 
      status: 500 
    });
  }
} 