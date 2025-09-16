import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch the detailer profile from the database using the ID from the session
  const detailer = await prisma.detailer.findUnique({
<<<<<<< Updated upstream
    where: { email: session.user.email },
    select: {
      id: true,
      email: true,
      name: true,
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
=======
    where: { id: session.user.id },
    include: {
      services: true,
      portfolioImages: true,
>>>>>>> Stashed changes
    },
  });

  if (!detailer) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  return NextResponse.json(detailer);
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await request.json();

  // Only allow updating these fields
  const allowedFields = [
<<<<<<< Updated upstream
    'name', 'photo', 'businessName', 'phone', 'address', 'city', 'state', 'zipCode',
    'description', 'latitude', 'longitude', 'priceRange', 'website', 'imageUrl', 'businessHours', 'verified'
=======
    'firstName', 'lastName', 'photo', 'businessName', 'phone', 'address', 'city', 'state', 'zipCode',
    'description', 'latitude', 'longitude', 'priceRange', 'website', 'imageUrl', 'businessHours', 'verified',
    'facebook', 'instagram', 'tiktok'
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
        name: true,
=======
        firstName: true,
        lastName: true,
>>>>>>> Stashed changes
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
      },
    });
    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json({ error: 'Failed to update profile', details: (e as Error).message }, { status: 500 });
  }
}
