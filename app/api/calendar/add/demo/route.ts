import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Create a simple demo calendar page
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Add to Calendar - Car Detailing Appointment</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
            line-height: 1.6;
        }
        .container {
            background: white;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            text-align: center;
            margin-bottom: 10px;
        }
        .subtitle {
            text-align: center;
            color: #666;
            margin-bottom: 30px;
        }
        .appointment-details {
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 30px;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            padding: 5px 0;
        }
        .detail-label {
            font-weight: 600;
            color: #555;
        }
        .detail-value {
            color: #333;
        }
        .calendar-options {
            display: grid;
            gap: 15px;
            margin-bottom: 30px;
        }
        .calendar-button {
            display: flex;
            align-items: center;
            padding: 15px 20px;
            border: 2px solid #007AFF;
            border-radius: 10px;
            text-decoration: none;
            color: #007AFF;
            font-weight: 600;
            transition: all 0.3s ease;
            background: white;
        }
        .calendar-button:hover {
            background: #007AFF;
            color: white;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,122,255,0.3);
        }
        .calendar-icon {
            margin-right: 12px;
            font-size: 20px;
        }
        .download-button {
            background: #28a745;
            color: white;
            border: none;
            padding: 15px 20px;
            border-radius: 10px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            width: 100%;
        }
        .download-button:hover {
            background: #218838;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(40,167,69,0.3);
        }
        .footer {
            text-align: center;
            color: #666;
            font-size: 14px;
            margin-top: 30px;
        }
        @media (max-width: 480px) {
            body {
                padding: 10px;
            }
            .container {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📅 Add to Calendar</h1>
        <p class="subtitle">Car Detailing Appointment</p>
        
        <div class="appointment-details">
            <div class="detail-row">
                <span class="detail-label">Service:</span>
                <span class="detail-value">Car Detailing</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Date:</span>
                <span class="detail-value">Your scheduled date</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Time:</span>
                <span class="detail-value">Your scheduled time</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Location:</span>
                <span class="detail-value">Your address</span>
            </div>
        </div>
        
        <div class="calendar-options">
            <a href="https://calendar.google.com/calendar/render?action=TEMPLATE&text=Car%20Detailing%20Appointment&dates=20250101T140000Z/20250101T160000Z&details=Mobile%20car%20detailing%20service&location=Your%20Address" 
               class="calendar-button" target="_blank">
                <span class="calendar-icon">📅</span>
                <span>Add to Google Calendar</span>
            </a>
            
            <a href="https://outlook.live.com/calendar/0/deeplink/compose?subject=Car%20Detailing%20Appointment&startdt=2025-01-01T14:00:00Z&enddt=2025-01-01T16:00:00Z&body=Mobile%20car%20detailing%20service%20at%20your%20address" 
               class="calendar-button" target="_blank">
                <span class="calendar-icon">📅</span>
                <span>Add to Outlook</span>
            </a>
            
            <a href="https://calendar.apple.com/event?title=Car%20Detailing%20Appointment&startDate=2025-01-01T14:00:00Z&endDate=2025-01-01T16:00:00Z&notes=Mobile%20car%20detailing%20service" 
               class="calendar-button" target="_blank">
                <span class="calendar-icon">📅</span>
                <span>Add to Apple Calendar</span>
            </a>
        </div>
        
        <button class="download-button" onclick="downloadICS()">
            📥 Download .ics File
        </button>
        
        <div class="footer">
            <p>Choose your preferred calendar app above, or download the .ics file to import into any calendar application.</p>
        </div>
    </div>
    
    <script>
        function downloadICS() {
            // Create a simple demo ICS file
            const icsContent = \`BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Reeva Car//Mobile Detailing//EN
BEGIN:VEVENT
UID:demo-appointment@reevacar.com
DTSTAMP:\${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTSTART:20250101T140000Z
DTEND:20250101T160000Z
SUMMARY:Car Detailing Appointment
DESCRIPTION:Mobile car detailing service at your address
LOCATION:Your Address
STATUS:CONFIRMED
TRANSP:OPAQUE
BEGIN:VALARM
TRIGGER:-PT1H
ACTION:DISPLAY
DESCRIPTION:Car detailing appointment reminder
END:VALARM
END:VEVENT
END:VCALENDAR\`;
            
            const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'car-detailing-appointment.ics';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    </script>
</body>
</html>
    `;

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    console.error('Error generating calendar page:', error);
    return NextResponse.json(
      { error: 'Failed to generate calendar page' },
      { status: 500 }
    );
  }
}
