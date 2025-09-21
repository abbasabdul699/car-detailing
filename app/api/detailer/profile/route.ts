import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.id) {
      console.log("No session or user ID found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Fetching profile for user ID:", session.user.id);

    // Fetch the detailer profile from the database using the ID from the session
    const detailer = await prisma.detailer.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        businessName: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        twilioPhoneNumber: true,
        smsEnabled: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        description: true,
        latitude: true,
        longitude: true,
        priceRange: true,
        website: true,
        imageUrl: true,
        businessHours: true,
        verified: true,
        instagram: true,
        tiktok: true,
        facebook: true,
        googleCalendarConnected: true,
        syncAppointments: true,
        syncAvailability: true,
        instagramConnected: true,
        instagramDmEnabled: true,
        services: {
          include: {
            service: true
          }
        },
        images: true,
        detailerImages: true,
      },
    });

    if (!detailer) {
      console.log("Detailer not found for ID:", session.user.id);
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    console.log("Profile found successfully");
    return NextResponse.json(detailer);
  } catch (error) {
    console.error("Error in GET /api/detailer/profile:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await request.json();

  // Only allow updating these fields
  const allowedFields = [
    'firstName', 'lastName', 'photo', 'businessName', 'phone', 'address', 'city', 'state', 'zipCode',
    'description', 'latitude', 'longitude', 'priceRange', 'website', 'imageUrl', 'businessHours', 'verified',
    'facebook', 'instagram', 'tiktok'
  ];
  const updateData: Record<string, any> = {};
  for (const key of allowedFields) {
    if (key in data) updateData[key] = data[key];
  }

  try {
    const updated = await prisma.detailer.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        photo: true,
        businessName: true,
        phone: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        description: true,
        latitude: true,
        longitude: true,
        priceRange: true,
        website: true,
        imageUrl: true,
        businessHours: true,
        verified: true,
        firstName: true,
        lastName: true,
        facebook: true,
        instagram: true,
        tiktok: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}