import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { normalizeToE164 } from '@/lib/phone';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const customer = await prisma.customerSnapshot.findUnique({
      where: { id }
    });

    if (!customer || customer.detailerId !== session.user.id) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json({ customer });
  } catch (error) {
    console.error('Error fetching customer:', error);
    return NextResponse.json({ error: 'Failed to fetch customer' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
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

    // Check if customer exists and belongs to detailer
    const existing = await prisma.customerSnapshot.findUnique({
      where: { id }
    });

    if (!existing || existing.detailerId !== session.user.id) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // If phone is being updated, normalize it
    const normalizedPhone = customerPhone ? (normalizeToE164(customerPhone) || customerPhone) : existing.customerPhone;

    // Merge data field with existing data
    let mergedData = existing.data ? (typeof existing.data === 'object' ? existing.data : {}) : {};
    if (data && typeof data === 'object') {
      mergedData = { ...mergedData, ...data };
    }

    // If phone changed, we need to handle the unique constraint
    let customer;
    if (normalizedPhone !== existing.customerPhone) {
      // Delete old and create new (or update if exists)
      await prisma.customerSnapshot.delete({ where: { id } });
      customer = await prisma.customerSnapshot.upsert({
        where: { 
          detailerId_customerPhone: { 
            detailerId: session.user.id, 
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
          detailerId: session.user.id,
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
    } else {
      customer = await prisma.customerSnapshot.update({
        where: { id },
        data: {
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
        }
      });
    }

    return NextResponse.json({ customer });
  } catch (error) {
    console.error('Error updating customer:', error);
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const customer = await prisma.customerSnapshot.findUnique({
      where: { id }
    });

    if (!customer || customer.detailerId !== session.user.id) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    await prisma.customerSnapshot.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting customer:', error);
    return NextResponse.json({ error: 'Failed to delete customer' }, { status: 500 });
  }
}

