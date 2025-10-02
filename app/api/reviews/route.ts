import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/reviews - Get reviews for a detailer
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const detailerId = searchParams.get('detailerId');

    if (!detailerId) {
      return NextResponse.json({ error: 'Detailer ID is required' }, { status: 400 });
    }

    const reviews = await prisma.review.findMany({
      where: { detailerId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ reviews });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

// POST /api/reviews - Create a new review
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { detailerId, authorName, rating, comment } = body;

    if (!detailerId || !authorName || !rating || !comment) {
      return NextResponse.json(
        { error: 'Detailer ID, author name, rating, and comment are required' },
        { status: 400 }
      );
    }

    // Validate rating (1-5)
    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Create the review
    const review = await prisma.review.create({
      data: {
        detailerId,
        authorName,
        rating,
        comment,
      },
    });

    // Create a notification for the detailer about the new review
    try {
      await prisma.notification.create({
        data: {
          detailerId: detailerId,
          message: `New ${rating}-star review from ${authorName}`,
          type: 'review',
          link: '/detailer-dashboard',
        },
      });
    } catch (notificationError) {
      // Don't fail the review creation if notification creation fails
      console.error('Error creating review notification:', notificationError);
    }

    return NextResponse.json({ success: true, review });
  } catch (error) {
    console.error('Error creating review:', error);
    return NextResponse.json(
      { error: 'Failed to create review' },
      { status: 500 }
    );
  }
}
