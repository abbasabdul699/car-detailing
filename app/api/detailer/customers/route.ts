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

    // Update all events that reference this customer
    try {
      // Find all events for this detailer
      const allEvents = await prisma.event.findMany({
        where: { detailerId },
        select: { id: true, description: true }
      });

      for (const event of allEvents) {
        if (!event.description || !event.description.includes('__METADATA__:')) {
          continue;
        }

        try {
          const parts = event.description.split('__METADATA__:');
          const metadataJson = parts[1] || '{}';
          const metadata = JSON.parse(metadataJson);
          
          // Check if this event references the customer we're updating
          const eventCustomerPhone = metadata.customerPhone;
          if (eventCustomerPhone) {
            const normalizedEventPhone = normalizeToE164(eventCustomerPhone) || eventCustomerPhone;
            if (normalizedEventPhone === normalizedPhone) {
              // Update the event's metadata with the new customer information
              const updatedMetadata = {
                ...metadata,
                customerName: customerName !== undefined ? customerName : metadata.customerName,
                customerPhone: normalizedPhone,
                customerEmail: customerEmail !== undefined ? customerEmail : metadata.customerEmail,
                customerAddress: address !== undefined ? address : metadata.customerAddress,
                locationType: locationType !== undefined ? locationType : metadata.locationType,
                customerType: customerType !== undefined ? customerType : metadata.customerType,
                vehicleModel: vehicleModel !== undefined ? vehicleModel : metadata.vehicleModel,
                services: services !== undefined ? services : metadata.services
              };

              const cleanDescription = parts[0].trim();
              const newMetadataJson = JSON.stringify(updatedMetadata);
              const newDescription = cleanDescription 
                ? `${cleanDescription}\n\n__METADATA__:${newMetadataJson}`
                : `__METADATA__:${newMetadataJson}`;

              await prisma.event.update({
                where: { id: event.id },
                data: { description: newDescription }
              });
            }
          }
        } catch (parseError) {
          // Skip events with invalid metadata
          console.error(`Error parsing metadata for event ${event.id}:`, parseError);
          continue;
        }
      }
      
      console.log(`✅ Updated events referencing customer phone: ${normalizedPhone}`);
    } catch (eventUpdateError) {
      console.error('Error updating events for customer:', eventUpdateError);
      // Don't fail the customer update if event updates fail
    }

    return NextResponse.json({ customer }, { status: 201 });
  } catch (error) {
    console.error('Error creating/updating customer:', error);
    return NextResponse.json({ error: 'Failed to create/update customer' }, { status: 500 });
  }
}

