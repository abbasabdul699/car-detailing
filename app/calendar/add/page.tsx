'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function CalendarAddPage() {
  const searchParams = useSearchParams();
  const [appointmentDetails, setAppointmentDetails] = useState({
    name: 'Customer',
    date: 'Your scheduled date',
    time: 'Your scheduled time',
    car: 'Your vehicle',
    service: 'Car Detailing',
    address: 'Your address',
    formattedDate: '2025-01-01',
    formattedTime: '14:00',
    endTime: '16:00'
  });

  useEffect(() => {
    // Extract parameters from URL
    const name = searchParams.get('name') || 'Customer';
    const date = searchParams.get('date') || 'Your scheduled date';
    const time = searchParams.get('time') || 'Your scheduled time';
    const car = searchParams.get('car') || 'Your vehicle';
    const service = searchParams.get('service') || 'Car Detailing';
    const address = searchParams.get('address') || 'Your address';
    const scheduledDate = searchParams.get('scheduledDate');
    const scheduledTime = searchParams.get('scheduledTime');

    // Format date and time for calendar links
    let formattedDate = '20250101';
    let formattedTime = '140000';
    let endTime = '160000';

    // Try to parse date and time from the URL parameters or formatted strings
    if (scheduledDate && scheduledTime) {
      try {
        const date = new Date(scheduledDate);
        const [timeStr, period] = scheduledTime.split(' ');
        const [hours, minutes] = timeStr.split(':');
        let hour24 = parseInt(hours);
        if (period === 'PM' && hour24 !== 12) hour24 += 12;
        if (period === 'AM' && hour24 === 12) hour24 = 0;
        
        formattedDate = date.toISOString().slice(0, 10).replace(/-/g, '');
        formattedTime = `${hour24.toString().padStart(2, '0')}${minutes}00`;
        endTime = `${(hour24 + 2).toString().padStart(2, '0')}${minutes}00`;
      } catch (e) {
        console.error('Error parsing scheduledDate/scheduledTime:', e);
      }
    } else {
      // Try to parse from the formatted date/time strings
      try {
        // Parse date like "10/02/2025 (Thursday)" or "09/27/2025 (Saturday)"
        const dateMatch = date.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (dateMatch) {
          const [, month, day, year] = dateMatch;
          const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          formattedDate = dateObj.toISOString().slice(0, 10).replace(/-/g, '');
        }
        
        // Parse time like "10 PM" or "9 PM"
        const timeMatch = time.match(/(\d{1,2})\s*(AM|PM)/i);
        if (timeMatch) {
          const [, hours, period] = timeMatch;
          let hour24 = parseInt(hours);
          if (period.toUpperCase() === 'PM' && hour24 !== 12) hour24 += 12;
          if (period.toUpperCase() === 'AM' && hour24 === 12) hour24 = 0;
          
          formattedTime = `${hour24.toString().padStart(2, '0')}0000`;
          endTime = `${(hour24 + 2).toString().padStart(2, '0')}0000`;
        }
      } catch (e) {
        console.error('Error parsing date/time from strings:', e);
      }
    }

    setAppointmentDetails({
      name,
      date,
      time,
      car,
      service,
      address,
      formattedDate,
      formattedTime,
      endTime
    });
  }, [searchParams]);

  const handleDownloadICS = () => {
    // Create ICS file with actual appointment details
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Reeva Car//Mobile Detailing//EN
BEGIN:VEVENT
UID:${appointmentDetails.formattedDate}${appointmentDetails.formattedTime}@reevacar.com
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTSTART:${appointmentDetails.formattedDate}T${appointmentDetails.formattedTime}Z
DTEND:${appointmentDetails.formattedDate}T${appointmentDetails.endTime}Z
SUMMARY:Car Detailing - ${appointmentDetails.name}
DESCRIPTION:Mobile car detailing service\\n\\nService: ${appointmentDetails.service}\\nCustomer: ${appointmentDetails.name}\\nVehicle: ${appointmentDetails.car}\\nLocation: ${appointmentDetails.address}
LOCATION:${appointmentDetails.address}
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
              <span className="font-semibold text-gray-700">Customer:</span>
              <span className="text-gray-900">{appointmentDetails.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-700">Service:</span>
              <span className="text-gray-900">{appointmentDetails.service}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-700">Date:</span>
              <span className="text-gray-900">{appointmentDetails.date}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-700">Time:</span>
              <span className="text-gray-900">{appointmentDetails.time}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-700">Vehicle:</span>
              <span className="text-gray-900">{appointmentDetails.car}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-700">Location:</span>
              <span className="text-gray-900">{appointmentDetails.address}</span>
            </div>
          </div>
        </div>
        
        <div className="space-y-4 mb-8">
          <a 
            href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=Car%20Detailing%20-%20${encodeURIComponent(appointmentDetails.name)}&dates=${appointmentDetails.formattedDate}T${appointmentDetails.formattedTime}Z/${appointmentDetails.formattedDate}T${appointmentDetails.endTime}Z&details=Mobile%20car%20detailing%20service%0A%0AService:%20${encodeURIComponent(appointmentDetails.service)}%0ACustomer:%20${encodeURIComponent(appointmentDetails.name)}%0AVehicle:%20${encodeURIComponent(appointmentDetails.car)}%0ALocation:%20${encodeURIComponent(appointmentDetails.address)}&location=${encodeURIComponent(appointmentDetails.address)}`}
            className="flex items-center justify-center w-full p-4 border-2 border-blue-500 rounded-lg text-blue-500 font-semibold hover:bg-blue-500 hover:text-white transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="mr-3 text-xl">📅</span>
            <span>Add to Google Calendar</span>
          </a>
          
          <a 
            href={`https://outlook.live.com/calendar/0/deeplink/compose?subject=Car%20Detailing%20-%20${encodeURIComponent(appointmentDetails.name)}&startdt=${appointmentDetails.formattedDate.slice(0,4)}-${appointmentDetails.formattedDate.slice(4,6)}-${appointmentDetails.formattedDate.slice(6,8)}T${appointmentDetails.formattedTime.slice(0,2)}:${appointmentDetails.formattedTime.slice(2,4)}:00Z&enddt=${appointmentDetails.formattedDate.slice(0,4)}-${appointmentDetails.formattedDate.slice(4,6)}-${appointmentDetails.formattedDate.slice(6,8)}T${appointmentDetails.endTime.slice(0,2)}:${appointmentDetails.endTime.slice(2,4)}:00Z&body=Mobile%20car%20detailing%20service%0A%0AService:%20${encodeURIComponent(appointmentDetails.service)}%0ACustomer:%20${encodeURIComponent(appointmentDetails.name)}%0AVehicle:%20${encodeURIComponent(appointmentDetails.car)}%0ALocation:%20${encodeURIComponent(appointmentDetails.address)}`}
            className="flex items-center justify-center w-full p-4 border-2 border-blue-500 rounded-lg text-blue-500 font-semibold hover:bg-blue-500 hover:text-white transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="mr-3 text-xl">📅</span>
            <span>Add to Outlook</span>
          </a>
          
          <a 
            href={`https://calendar.apple.com/event?title=Car%20Detailing%20-%20${encodeURIComponent(appointmentDetails.name)}&startDate=${appointmentDetails.formattedDate.slice(0,4)}-${appointmentDetails.formattedDate.slice(4,6)}-${appointmentDetails.formattedDate.slice(6,8)}T${appointmentDetails.formattedTime.slice(0,2)}:${appointmentDetails.formattedTime.slice(2,4)}:00Z&endDate=${appointmentDetails.formattedDate.slice(0,4)}-${appointmentDetails.formattedDate.slice(4,6)}-${appointmentDetails.formattedDate.slice(6,8)}T${appointmentDetails.endTime.slice(0,2)}:${appointmentDetails.endTime.slice(2,4)}:00Z&notes=Mobile%20car%20detailing%20service%0A%0AService:%20${encodeURIComponent(appointmentDetails.service)}%0ACustomer:%20${encodeURIComponent(appointmentDetails.name)}%0AVehicle:%20${encodeURIComponent(appointmentDetails.car)}%0ALocation:%20${encodeURIComponent(appointmentDetails.address)}`}
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
