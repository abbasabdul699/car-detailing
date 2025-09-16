import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from '@/lib/prisma';

// GET all notifications for the logged-in detailer
export async function GET(request: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const notifications = await prisma.notification.findMany({
            where: { detailerId: session.user.id },
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json(notifications);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }
}

// PATCH to mark notifications as read
export async function PATCH(request: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { notificationIds } = await request.json();

    if (!notificationIds || !Array.isArray(notificationIds)) {
        return NextResponse.json({ error: 'Invalid request body, expected "notificationIds" array' }, { status: 400 });
    }

    try {
        await prisma.notification.updateMany({
            where: {
                id: { in: notificationIds },
                detailerId: session.user.id, // Ensure user can only update their own notifications
            },
            data: { read: true },
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating notifications:', error);
        return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
    }
} 