import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { normalizeToE164 } from '@/lib/phone';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const detailerId = session.user.id;
    const customers = await prisma.customerSnapshot.findMany({
      where: { detailerId },
      orderBy: { updatedAt: 'desc' }
    });

    return NextResponse.json({ customers });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const detailerId = session.user.id;
    const body = await request.json();
    const { 
      customerPhone, 
      customerName, 
      customerEmail,
      address, 
      locationType,
      customerType,
      vehicle, 
      vehicleYear, 
      vehicleMake, 
      vehicleModel,
      services,
      vcardSent,
      data
    } = body;

    if (!customerPhone) {
      return NextResponse.json({ error: 'Customer phone is required' }, { status: 400 });
    }

    const normalizedPhone = normalizeToE164(customerPhone) || customerPhone;
    
    // Get existing customer to merge data if updating
    const existing = await prisma.customerSnapshot.findUnique({
      where: { 
        detailerId_customerPhone: { 
          detailerId, 
          customerPhone: normalizedPhone 
        } 
      }
    });
    
    // Merge data field with existing data
    let mergedData = existing?.data ? (typeof existing.data === 'object' ? existing.data : {}) : {};
    if (data && typeof data === 'object') {
      mergedData = { ...mergedData, ...data };
    }

    const customer = await prisma.customerSnapshot.upsert({
      where: { 
        detailerId_customerPhone: { 
          detailerId, 
          customerPhone: normalizedPhone 
        } 
      },
      update: {
        customerName,
        customerEmail,
        address,
        locationType,
        customerType,
        vehicle,
        vehicleYear,
        vehicleMake,
        vehicleModel,
        services: services || [],
        vcardSent,
        data: Object.keys(mergedData).length > 0 ? mergedData : null
      },
      create: {
        detailerId,
        customerPhone: normalizedPhone,
        customerName,
        customerEmail,
        address,
        locationType,
        customerType,
        vehicle,
        vehicleYear,
        vehicleMake,
        vehicleModel,
        services: services || [],
        vcardSent: vcardSent || false,
        data: Object.keys(mergedData).length > 0 ? mergedData : null
      }
    });

    return NextResponse.json({ customer }, { status: 201 });
  } catch (error) {
    console.error('Error creating/updating customer:', error);
    return NextResponse.json({ error: 'Failed to create/update customer' }, { status: 500 });
  }
}

