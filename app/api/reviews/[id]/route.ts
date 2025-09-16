import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// PUT a reply on a review
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const detailerId = (session?.user as any)?.id;
  const reviewId = params.id;

  if (!detailerId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { reply } = await request.json();
    if (!reply) {
      return NextResponse.json({ error: 'Reply content is required' }, { status: 400 });
    }

    // First, verify the review belongs to the logged-in detailer
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review || review.detailerId !== detailerId) {
      return NextResponse.json({ error: 'Review not found or you do not have permission to reply to it' }, { status: 404 });
    }

    // Update the review with the reply
    const updatedReview = await prisma.review.update({
      where: { id: reviewId },
      data: { reply },
    });

    return NextResponse.json(updatedReview);
  } catch (error) {
    console.error(`Error adding reply to review ${reviewId}:`, error);
    return NextResponse.json({ error: 'Failed to add reply' }, { status: 500 });
  }
}
