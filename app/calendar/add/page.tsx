'use client';

export default function CalendarAddPage() {
  const handleDownloadICS = () => {
    // Create a simple demo ICS file
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Reeva Car//Mobile Detailing//EN
BEGIN:VEVENT
UID:demo-appointment@reevacar.com
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
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
END:VCALENDAR`;
    
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'car-detailing-appointment.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            📅 Add to Calendar
          </h1>
          <p className="text-gray-600">Car Detailing Appointment</p>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-6 mb-8">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-700">Service:</span>
              <span className="text-gray-900">Car Detailing</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-700">Date:</span>
              <span className="text-gray-900">Your scheduled date</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-700">Time:</span>
              <span className="text-gray-900">Your scheduled time</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-700">Location:</span>
              <span className="text-gray-900">Your address</span>
            </div>
          </div>
        </div>
        
        <div className="space-y-4 mb-8">
          <a 
            href="https://calendar.google.com/calendar/render?action=TEMPLATE&text=Car%20Detailing%20Appointment&dates=20250101T140000Z/20250101T160000Z&details=Mobile%20car%20detailing%20service&location=Your%20Address" 
            className="flex items-center justify-center w-full p-4 border-2 border-blue-500 rounded-lg text-blue-500 font-semibold hover:bg-blue-500 hover:text-white transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="mr-3 text-xl">📅</span>
            <span>Add to Google Calendar</span>
          </a>
          
          <a 
            href="https://outlook.live.com/calendar/0/deeplink/compose?subject=Car%20Detailing%20Appointment&startdt=2025-01-01T14:00:00Z&enddt=2025-01-01T16:00:00Z&body=Mobile%20car%20detailing%20service%20at%20your%20address" 
            className="flex items-center justify-center w-full p-4 border-2 border-blue-500 rounded-lg text-blue-500 font-semibold hover:bg-blue-500 hover:text-white transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="mr-3 text-xl">📅</span>
            <span>Add to Outlook</span>
          </a>
          
          <a 
            href="https://calendar.apple.com/event?title=Car%20Detailing%20Appointment&startDate=2025-01-01T14:00:00Z&endDate=2025-01-01T16:00:00Z&notes=Mobile%20car%20detailing%20service" 
            className="flex items-center justify-center w-full p-4 border-2 border-blue-500 rounded-lg text-blue-500 font-semibold hover:bg-blue-500 hover:text-white transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="mr-3 text-xl">📅</span>
            <span>Add to Apple Calendar</span>
          </a>
        </div>
        
        <button 
          onClick={handleDownloadICS}
          className="w-full bg-green-600 text-white font-semibold py-4 px-6 rounded-lg hover:bg-green-700 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
        >
          📥 Download .ics File
        </button>
        
        <div className="text-center mt-8">
          <p className="text-gray-600 text-sm">
            Choose your preferred calendar app above, or download the .ics file to import into any calendar application.
          </p>
        </div>
      </div>
    </div>
  );
}
