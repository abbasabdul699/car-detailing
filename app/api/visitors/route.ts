import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST: Record a new visit
export async function POST(req: NextRequest) {
  try {
    const { detailerId } = await req.json();
    
    if (!detailerId) {
      return NextResponse.json({ error: "Missing detailerId" }, { status: 400 });
    }

    // Record the visit
    await prisma.visitor.create({
      data: {
        detailerId: detailerId,
        viewedAt: new Date(),
      },
    });

    // Create a notification for the detailer about the new visitor
    try {
      // Check if we already created a visitor notification in the last hour to avoid spam
      const recentNotification = await prisma.notification.findFirst({
        where: {
          detailerId: detailerId,
          type: 'visitor',
          createdAt: {
            gte: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
          },
        },
      });

      if (!recentNotification) {
        await prisma.notification.create({
          data: {
            detailerId: detailerId,
            message: "Someone viewed your profile page",
            type: 'visitor',
            link: '/detailer-dashboard',
          },
        });
      }
    } catch (notificationError) {
      // Don't fail the visitor recording if notification creation fails
      console.error('Error creating visitor notification:', notificationError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error recording visitor:', error);
    return NextResponse.json({ error: 'Failed to record visit' }, { status: 500 });
  }
}
