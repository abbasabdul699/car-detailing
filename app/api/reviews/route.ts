import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST a new review
export async function POST(request: NextRequest) {
  try {
    const { detailerId, authorName, rating, comment } = await request.json();

    if (!detailerId || !authorName || !rating || !comment) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
        return NextResponse.json({ error: 'Rating must be a number between 1 and 5' }, { status: 400 });
    }

    const newReview = await prisma.review.create({
      data: {
        detailerId,
        authorName,
        rating,
        comment,
      },
    });

    // Create a notification for the detailer
    await prisma.notification.create({
      data: {
        detailerId,
        message: `You have a new ${rating}-star review from ${authorName}.`,
        type: 'NEW_REVIEW',
        link: `/detailer-dashboard/reviews`, // Link to the reviews page
      },
    });

    return NextResponse.json(newReview, { status: 201 });
  } catch (error) {
    console.error('Error creating review:', error);
    return NextResponse.json({ error: 'Failed to create review' }, { status: 500 });
  }
}


// GET all reviews for a detailer
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const detailerId = searchParams.get('detailerId');

    if (!detailerId) {
        return NextResponse.json({ error: 'Detailer ID is required' }, { status: 400 });
    }

    try {
        const reviews = await prisma.review.findMany({
            where: { detailerId },
            orderBy: {
                createdAt: 'desc',
            },
    });
        return NextResponse.json(reviews);
  } catch (error) {
        console.error(`Error fetching reviews for detailer ${detailerId}:`, error);
        return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
} 