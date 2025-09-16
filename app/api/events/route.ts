import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// GET /api/events
// Fetches events for the logged-in detailer
export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const detailerId = session.user.id;

    try {
        const events = await prisma.event.findMany({
            where: { detailerId },
        });
        return NextResponse.json({ events: events || [] });
    } catch (error) {
        console.error("Error fetching events:", error);
        return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
    }
}

// POST /api/events
// Creates a new event for the logged-in detailer
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const detailerId = session.user.id;

    try {
        const body = await req.json();
        const { title, startTime, endTime, isAllDay, color, location, description } = body;

        if (!title || !startTime || !endTime) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const newEvent = await prisma.event.create({
            data: {
                title,
                startTime: new Date(startTime),
                endTime: new Date(endTime),
                isAllDay: isAllDay || false,
                color,
                location,
                description,
                detailerId,
            },
        });

        // We will add the Google Calendar sync logic here later
        
        return NextResponse.json(newEvent, { status: 201 });
    } catch (error) {
        console.error("Error creating event:", error);
        return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
    }
} 