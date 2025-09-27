import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper function to generate .ics calendar file content
function generateICSContent(booking: any, detailer: any): string {
  const startDateTime = new Date(booking.scheduledDate);
  
  // Parse time if provided
  if (booking.scheduledTime) {
    const [time, period] = booking.scheduledTime.split(' ');
    const [hours, minutes] = time.split(':');
    let hour24 = parseInt(hours);
    if (period === 'PM' && hour24 !== 12) hour24 += 12;
    if (period === 'AM' && hour24 === 12) hour24 = 0;
    startDateTime.setHours(hour24, parseInt(minutes), 0, 0);
  } else {
    startDateTime.setHours(14, 0, 0, 0); // Default to 2 PM
  }
  
  // Calculate end time (default 2 hours)
  const endDateTime = new Date(startDateTime);
  endDateTime.setHours(endDateTime.getHours() + 2);
  
  // Format dates for ICS (YYYYMMDDTHHMMSSZ format)
  const formatICSDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };
  
  const services = Array.isArray(booking.services) 
    ? booking.services.join(', ') 
    : booking.services || 'Car Detailing';
  
  const location = booking.vehicleLocation || booking.address || 'Your location';
  const customerName = booking.customerName || 'Customer';
  
  // Generate unique ID for the event
  const eventId = `${booking.id}@reevacar.com`;
  
  // Create ICS content
  const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Reeva Car//Mobile Detailing//EN
BEGIN:VEVENT
UID:${eventId}
DTSTAMP:${formatICSDate(new Date())}
DTSTART:${formatICSDate(startDateTime)}
DTEND:${formatICSDate(endDateTime)}
SUMMARY:Car Detailing - ${customerName}
DESCRIPTION:Mobile car detailing appointment\\n\\nServices: ${services}\\nCustomer: ${customerName}\\nPhone: ${booking.customerPhone}\\nVehicle: ${booking.vehicleType || 'N/A'}\\nLocation: ${location}\\nDetailer: ${detailer.businessName}\\nPhone: ${detailer.phone}
LOCATION:${location}
STATUS:CONFIRMED
TRANSP:OPAQUE
BEGIN:VALARM
TRIGGER:-PT1H
ACTION:DISPLAY
DESCRIPTION:Car detailing appointment reminder
END:VALARM
END:VEVENT
END:VCALENDAR`;

  return icsContent;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params;
    
    // Fetch booking and detailer information
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        detailer: {
          select: {
            id: true,
            businessName: true,
            phone: true
          }
        }
      }
    });
    
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }
    
    // Generate ICS content
    const icsContent = generateICSContent(booking, booking.detailer);
    
    // Return the .ics file with proper headers
    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="detailing-appointment-${bookingId}.ics"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
    
  } catch (error) {
    console.error('Error generating calendar file:', error);
    return NextResponse.json({ error: 'Failed to generate calendar file' }, { status: 500 });
  }
}
