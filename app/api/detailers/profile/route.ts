import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const data = await request.json()
    
    // Update detailer record
    const updatedDetailer = await prisma.detailer.update({
      where: { email: session.user.email },
      data: {
        businessName: data.businessName,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phoneNumber,
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        description: data.description,
        instagram: data.instagram,
        tiktok: data.tiktok,
        website: data.website,
      }
    })

    return NextResponse.json(updatedDetailer)

  } catch (error) {
    console.error('Update error:', error)
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const detailer = await prisma.detailer.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        businessName: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        description: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        profileImage: true,
        images: true,
        services: true
      }
    });

    if (!detailer) {
      return NextResponse.json({ error: 'Detailer not found' }, { status: 404 });
    }

    return NextResponse.json(detailer);
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
} 