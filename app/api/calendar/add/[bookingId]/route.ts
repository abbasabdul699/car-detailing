import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
    
    const services = Array.isArray(booking.services) 
      ? booking.services.join(', ') 
      : booking.services || 'Car Detailing';
    
    const location = booking.vehicleLocation || booking.address || 'Your location';
    const customerName = booking.customerName || 'Customer';
    
    // Create Google Calendar URL
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=Car+Detailing+-+${encodeURIComponent(customerName)}&dates=${startDateTime.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${endDateTime.toISOString().replace(/[-:]/g, '').split('.')[0]}Z&details=${encodeURIComponent(`Services: ${services}\nCustomer: ${customerName}\nPhone: ${booking.customerPhone}\nVehicle: ${booking.vehicleType || 'N/A'}\nLocation: ${location}\nDetailer: ${booking.detailer.businessName}\nPhone: ${booking.detailer.phone}`)}&location=${encodeURIComponent(location)}`;
    
    // Create Outlook URL
    const outlookUrl = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(`Car Detailing - ${customerName}`)}&startdt=${startDateTime.toISOString()}&enddt=${endDateTime.toISOString()}&body=${encodeURIComponent(`Services: ${services}\nCustomer: ${customerName}\nPhone: ${booking.customerPhone}\nVehicle: ${booking.vehicleType || 'N/A'}\nLocation: ${location}\nDetailer: ${booking.detailer.businessName}\nPhone: ${booking.detailer.phone}`)}&location=${encodeURIComponent(location)}`;
    
    // Create ICS download URL
    const icsUrl = `/api/calendar/download/${bookingId}`;
    
    // Return a mobile-friendly HTML page with calendar options
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Add to Calendar - Car Detailing Appointment</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 400px; margin: 0 auto; background: white; border-radius: 12px; padding: 24px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 24px; }
        .header h1 { color: #333; margin: 0 0 8px 0; font-size: 24px; }
        .header p { color: #666; margin: 0; font-size: 16px; }
        .event-details { background: #f8f9fa; padding: 16px; border-radius: 8px; margin-bottom: 24px; }
        .event-details h3 { margin: 0 0 12px 0; color: #333; font-size: 18px; }
        .detail { margin: 8px 0; color: #555; }
        .detail strong { color: #333; }
        .calendar-options h3 { color: #333; margin: 0 0 16px 0; font-size: 18px; }
        .calendar-btn { display: block; width: 100%; padding: 16px; margin: 12px 0; border: none; border-radius: 8px; font-size: 16px; font-weight: 500; text-decoration: none; text-align: center; cursor: pointer; transition: all 0.2s; }
        .google-btn { background: #4285f4; color: white; }
        .google-btn:hover { background: #3367d6; }
        .outlook-btn { background: #0078d4; color: white; }
        .outlook-btn:hover { background: #106ebe; }
        .ics-btn { background: #34a853; color: white; }
        .ics-btn:hover { background: #2d8f47; }
        .apple-btn { background: #000; color: white; }
        .apple-btn:hover { background: #333; }
        .icon { margin-right: 8px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📅 Add to Calendar</h1>
            <p>Choose your preferred calendar app</p>
        </div>
        
        <div class="event-details">
            <h3>Appointment Details</h3>
            <div class="detail"><strong>Date:</strong> ${startDateTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
            <div class="detail"><strong>Time:</strong> ${startDateTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} - ${endDateTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</div>
            <div class="detail"><strong>Service:</strong> ${services}</div>
            <div class="detail"><strong>Location:</strong> ${location}</div>
            <div class="detail"><strong>Detailer:</strong> ${booking.detailer.businessName}</div>
        </div>
        
        <div class="calendar-options">
            <h3>Add to Calendar</h3>
            <a href="${googleCalendarUrl}" class="calendar-btn google-btn">
                <span class="icon">📅</span>Google Calendar
            </a>
            <a href="${outlookUrl}" class="calendar-btn outlook-btn">
                <span class="icon">📅</span>Outlook
            </a>
            <a href="${icsUrl}" class="calendar-btn ics-btn">
                <span class="icon">📥</span>Download .ics File
            </a>
            <a href="webcal://${icsUrl.replace('https://', '').replace('http://', '')}" class="calendar-btn apple-btn">
                <span class="icon">📱</span>Apple Calendar
            </a>
        </div>
    </div>
</body>
</html>`;
    
    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
    
  } catch (error) {
    console.error('Error generating calendar page:', error);
    return NextResponse.json({ error: 'Failed to generate calendar page' }, { status: 500 });
  }
}
