import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { detailerAuthOptions } from '@/app/api/auth-detailer/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { normalizeToE164 } from '@/lib/phone';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(detailerAuthOptions);
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
    const session = await getServerSession(detailerAuthOptions);
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

    // Determine the final customer values (use provided values or keep existing)
    const finalCustomerName = customerName !== undefined ? customerName : existing.customerName;
    const finalCustomerEmail = customerEmail !== undefined ? customerEmail : existing.customerEmail;
    const finalAddress = address !== undefined ? address : existing.address;
    const finalLocationType = locationType !== undefined ? locationType : existing.locationType;
    const finalCustomerType = customerType !== undefined ? customerType : existing.customerType;
    const finalVehicleModel = vehicleModel !== undefined ? vehicleModel : existing.vehicleModel;
    const finalServices = services !== undefined ? services : existing.services;

    // If phone changed, we need to handle the unique constraint
    let customer;
    const oldPhone = existing.customerPhone;
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
          customerName: finalCustomerName,
          customerEmail: finalCustomerEmail,
          address: finalAddress,
          locationType: finalLocationType,
          customerType: finalCustomerType,
          vehicle: finalVehicleModel,
          vehicleYear,
          vehicleMake,
          vehicleModel: finalVehicleModel,
          services: finalServices || [],
          vcardSent,
          data: Object.keys(mergedData).length > 0 ? mergedData : null
        },
        create: {
          detailerId: session.user.id,
          customerPhone: normalizedPhone,
          customerName: finalCustomerName,
          customerEmail: finalCustomerEmail,
          address: finalAddress,
          locationType: finalLocationType,
          customerType: finalCustomerType,
          vehicle: finalVehicleModel,
          vehicleYear,
          vehicleMake,
          vehicleModel: finalVehicleModel,
          services: finalServices || [],
          vcardSent: vcardSent || false,
          data: Object.keys(mergedData).length > 0 ? mergedData : null
        }
      });
    } else {
      customer = await prisma.customerSnapshot.update({
        where: { id },
        data: {
          customerName: finalCustomerName,
          customerEmail: finalCustomerEmail,
          address: finalAddress,
          locationType: finalLocationType,
          customerType: finalCustomerType,
          vehicle: finalVehicleModel,
          vehicleYear,
          vehicleMake,
          vehicleModel: finalVehicleModel,
          services: finalServices || [],
          vcardSent,
          data: Object.keys(mergedData).length > 0 ? mergedData : null
        }
      });
    }

    // Update all events that reference this customer
    try {
      // Find all events for this detailer
      const allEvents = await prisma.event.findMany({
        where: { detailerId: session.user.id },
        select: { id: true, description: true }
      });

      // Phone numbers to search for (both old and new, in case phone changed)
      const phonesToSearch = [oldPhone, normalizedPhone].filter(Boolean);
      
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
          if (eventCustomerPhone && phonesToSearch.some(phone => {
            const normalizedEventPhone = normalizeToE164(eventCustomerPhone) || eventCustomerPhone;
            const normalizedSearch = normalizeToE164(phone) || phone;
            return normalizedEventPhone === normalizedSearch;
          })) {
            // Update the event's metadata with the new customer information
            const updatedMetadata = {
              ...metadata,
              customerName: finalCustomerName || metadata.customerName,
              customerPhone: normalizedPhone, // Always use the new phone
              customerEmail: finalCustomerEmail !== undefined ? finalCustomerEmail : metadata.customerEmail,
              customerAddress: finalAddress !== undefined ? finalAddress : metadata.customerAddress,
              locationType: finalLocationType !== undefined ? finalLocationType : metadata.locationType,
              customerType: finalCustomerType !== undefined ? finalCustomerType : metadata.customerType,
              vehicleModel: finalVehicleModel !== undefined ? finalVehicleModel : metadata.vehicleModel,
              services: finalServices !== undefined ? finalServices : metadata.services
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
    const session = await getServerSession(detailerAuthOptions);
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

