import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Review from 'app/models/Review';

export async function GET() {
  try {
    await dbConnect();
    const reviews = await Review.find({}).sort({ date: -1 });
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
  if (request.method !== 'POST') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    await dbConnect();
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

    const review = await Review.create({
      name: data.name,
      rating: data.rating,
      review: data.review,
      type: data.type,
      date: data.date || new Date(),
      verified: false,
      serviceType: data.serviceType || null,
      businessLocation: data.businessLocation || null,
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