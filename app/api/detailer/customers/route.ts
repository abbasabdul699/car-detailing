import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { detailerAuthOptions } from '@/app/api/auth-detailer/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { normalizeToE164 } from '@/lib/phone';
import { DateTime } from 'luxon';
import { normalizeVehicles } from '@/lib/vehicleValidation';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(detailerAuthOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const detailerId = session.user.id;
    const now = new Date();

    const [detailer, customers, events, bookings] = await Promise.all([
      prisma.detailer.findUnique({
        where: { id: detailerId },
        select: { timezone: true }
      }),
      prisma.customerSnapshot.findMany({
        where: { detailerId },
        orderBy: { updatedAt: 'desc' }
      }),
      prisma.event.findMany({
        where: { detailerId },
        select: { id: true, date: true, time: true, description: true, bookingId: true }
      }),
      prisma.booking.findMany({
        where: { detailerId },
        select: { id: true, scheduledDate: true, scheduledTime: true, status: true, customerPhone: true }
      })
    ]);

    const detailerTimezone = detailer?.timezone || 'America/New_York';
    const completedServiceStats = new Map<string, { count: number; lastAt: Date }>();

    const updateCompletedServiceStats = (phoneRaw: string | null | undefined, completedAt: Date) => {
      if (!phoneRaw) return;
      if (Number.isNaN(completedAt.getTime())) return;
      if (completedAt.getTime() >= now.getTime()) return;

      const normalizedPhone = normalizeToE164(phoneRaw) || phoneRaw;
      const existing = completedServiceStats.get(normalizedPhone);
      if (!existing) {
        completedServiceStats.set(normalizedPhone, { count: 1, lastAt: completedAt });
        return;
      }
      existing.count += 1;
      if (completedAt.getTime() > existing.lastAt.getTime()) {
        existing.lastAt = completedAt;
      }
    };

    const getStartDateTime = (date: Date, timeStr?: string | null) => {
      if (!timeStr) return date;
      let timePart = timeStr.trim();
      const rangeMatch = timePart.match(/(\d{1,2}:\d{2}\s*(AM|PM))/i);
      if (rangeMatch) {
        timePart = rangeMatch[1];
      } else if (timePart.includes('to')) {
        timePart = timePart.split(/\s+to\s+/i)[0]?.trim() || timePart;
      } else if (timePart.includes('-')) {
        timePart = timePart.split(/\s*-\s*/)[0]?.trim() || timePart;
      }

      let hour24: number | null = null;
      let minute = 0;
      const match = timePart.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
      if (match) {
        const hours = parseInt(match[1], 10);
        minute = match[2] ? parseInt(match[2], 10) : 0;
        const period = match[3]?.toUpperCase();
        if (period) {
          hour24 = hours % 12;
          if (period === 'PM') {
            hour24 += 12;
          }
        } else {
          hour24 = hours;
        }
      }

      if (hour24 === null || Number.isNaN(hour24) || Number.isNaN(minute)) {
        return date;
      }

      const year = date.getUTCFullYear();
      const month = date.getUTCMonth() + 1;
      const day = date.getUTCDate();
      const startDT = DateTime.fromObject(
        { year, month, day, hour: hour24, minute },
        { zone: detailerTimezone }
      );
      const jsDate = startDT.toUTC().toJSDate();
      return Number.isNaN(jsDate.getTime()) ? date : jsDate;
    };

    for (const booking of bookings) {
      if (booking.status !== 'completed') continue;
      const startDateTime = getStartDateTime(booking.scheduledDate, booking.scheduledTime);
      updateCompletedServiceStats(booking.customerPhone, startDateTime);
    }

    for (const event of events) {
      if (event.bookingId) continue;
      if (!event.description || !event.description.includes('__METADATA__:')) continue;
      const parts = event.description.split('__METADATA__:');
      const metadataJson = parts[1] || '{}';
      try {
        const metadata = JSON.parse(metadataJson);
        const customerPhone = metadata.customerPhone;
        if (!customerPhone) continue;
        const startDateTime = getStartDateTime(event.date, event.time || undefined);
        updateCompletedServiceStats(customerPhone, startDateTime);
      } catch (parseError) {
        continue;
      }
    }

    const customersWithHistory = customers.map((customer) => {
      const normalizedPhone = normalizeToE164(customer.customerPhone) || customer.customerPhone;
      const stats = completedServiceStats.get(normalizedPhone);
      const realCount = stats?.count ?? 0;
      const realLastAt = stats?.lastAt ? stats.lastAt.toISOString() : null;

      // Merge with imported historical data if present
      const customerData = (customer.data && typeof customer.data === 'object') ? customer.data as Record<string, unknown> : {};
      const importedVisitCount = typeof customerData.importedVisitCount === 'number' ? customerData.importedVisitCount : 0;
      const importedLastVisit = typeof customerData.importedLastVisit === 'string' ? customerData.importedLastVisit : null;

      // Imported visit count represents total historical visits (which may overlap
      // with real bookings tracked in the system), so take the greater of the two.
      const completedServiceCount = Math.max(realCount, importedVisitCount);

      // Last service = latest of real booking or imported last visit
      let lastCompletedServiceAt = realLastAt;
      if (importedLastVisit) {
        const importedDate = new Date(importedLastVisit);
        if (!isNaN(importedDate.getTime())) {
          if (!lastCompletedServiceAt || importedDate.getTime() > new Date(lastCompletedServiceAt).getTime()) {
            lastCompletedServiceAt = importedDate.toISOString();
          }
        }
      }

      return {
        ...customer,
        completedServiceCount,
        lastCompletedServiceAt
      };
    });

    return NextResponse.json({ customers: customersWithHistory });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(detailerAuthOptions);
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
      vehicles,       // string[] - multiple vehicles support
      customerNotes,  // Array<{id, text, createdAt}> - multiple notes support
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
    let mergedData: Record<string, any> = existing?.data ? (typeof existing.data === 'object' ? existing.data as Record<string, any> : {}) : {};
    if (data && typeof data === 'object') {
      mergedData = { ...mergedData, ...data };
    }
    const normalizedVehicleInput = normalizeVehicles(
      Array.isArray(vehicles)
        ? vehicles
        : [vehicleModel, vehicle].filter((v): v is string => typeof v === 'string' && !!v.trim())
    );

    // Store vehicles array in data.vehicles if provided
    if (vehicles !== undefined) {
      mergedData.vehicles = normalizedVehicleInput.vehicles;
    }
    // Store customerNotes array in data.customerNotes if provided
    if (customerNotes !== undefined) {
      mergedData.customerNotes = Array.isArray(customerNotes) ? customerNotes : [];
    }

    // Sync vehicleModel with first vehicle in vehicles array for backward compat
    const finalVehicleModel = normalizedVehicleInput.vehicleModel || vehicleModel || vehicle;
    const finalVehicleMake = normalizedVehicleInput.vehicleMake || vehicleMake;
    const finalVehicleYear = normalizedVehicleInput.vehicleYear || vehicleYear;

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
        vehicle: finalVehicleModel,
        vehicleYear: finalVehicleYear,
        vehicleMake: finalVehicleMake,
        vehicleModel: finalVehicleModel,
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
        vehicle: finalVehicleModel,
        vehicleYear: finalVehicleYear,
        vehicleMake: finalVehicleMake,
        vehicleModel: finalVehicleModel,
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
                vehicleModel: finalVehicleModel !== undefined ? finalVehicleModel : metadata.vehicleModel,
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
