'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

const SERVICE_DURATIONS: Record<string, number> = {
  'Full Detail': 180,
  'Exterior Detail': 90,
  'Interior Detail': 90,
  'Quick Wash': 45,
  // Add more services and their durations as needed
};

function generateTimeSlots(startHour = 9, endHour = 17, duration = 60) {
  const slots = [];
  for (let hour = startHour; hour <= endHour - Math.ceil(duration / 60); hour++) {
    slots.push(`${hour.toString().padStart(2, '0')}:00 PM`);
    slots.push(`${hour.toString().padStart(2, '0')}:30 PM`);
  }
  return slots;
}

function getNextNDates(n = 7) {
  const dates = [];
  const today = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function formatDateLabel(date: Date) {
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function ReviewStep({ params }: { params: { detailerId: string } }) {
  const { detailerId } = params;
  const searchParams = useSearchParams();
  const service = searchParams.get('service');
  const brand = searchParams.get('brand');
  const model = searchParams.get('model');
  const year = searchParams.get('year');
  const type = searchParams.get('type');
  const condition = searchParams.get('condition');

  const selectedServices = service ? service.split(',') : [];
  const totalDuration = selectedServices.reduce(
    (sum, s) => sum + (SERVICE_DURATIONS[s.trim()] || 60),
    0
  );
  const availableSlots = generateTimeSlots(9, 17, totalDuration);

  const dates = getNextNDates(7);
  const [selectedDate, setSelectedDate] = useState<Date>(dates[0]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = () => {
    if (!selectedTime || !selectedDate) return;
    // Submit booking with selected time and date
    alert(
      `Booking submitted for ${brand} ${model} ${year} (${type}) on ${selectedDate.toDateString()} at ${selectedTime} for services: ${selectedServices.join(', ')}`
    );
    // You can now send the selected time and date to your backend
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 p-4">
      <div className="bg-white rounded-xl shadow p-12 w-full max-w-2xl md:max-w-3xl mx-auto animate-fadein">
        {/* Top Section: Back Arrow, Title, and Review */}
        <button onClick={handleBack} className="text-3xl mb-2 text-black" aria-label="Back">
          &larr;
        </button>
        <h1 className="text-2xl font-bold mb-4">Schedule Your Service</h1>
        <div className="mb-6 space-y-1 text-base">
          <div>
            <span className="font-semibold">Vehicle:</span> {brand} {model} {year} {type && `(${type})`}
          </div>
          <div>
            <span className="font-semibold">Services:</span>
            <ul className="ml-4 mt-1 list-disc">
              {selectedServices.map((s, idx) => (
                <li key={idx} className="text-base">{s}</li>
              ))}
            </ul>
          </div>
          <div>
            <span className="font-semibold">Condition:</span> {condition}
          </div>
          <div>
            <span className="font-semibold">Estimated Duration:</span> {totalDuration} minutes
          </div>
        </div>

        {/* Date Selector */}
        <div className="w-full flex gap-2 overflow-x-auto pb-4 mb-4">
          {dates.map((date, idx) => (
            <button
              key={date.toISOString()}
              className={`flex flex-col items-center px-4 py-2 rounded-2xl border text-sm font-medium transition-all min-w-[90px]
                ${selectedDate.toDateString() === date.toDateString()
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-black border-gray-300 hover:bg-gray-100'}
              `}
              onClick={() => { setSelectedDate(date); setSelectedTime(null); }}
              type="button"
            >
              {formatDateLabel(date)}
            </button>
          ))}
        </div>

        {/* Time Slot Grid */}
        <div className="flex flex-col items-center mb-8">
          <div className="grid grid-cols-3 gap-4 w-full max-w-md mx-auto">
            {availableSlots.map((slot, idx) => (
              <button
                key={slot + idx}
                className={`py-4 px-0 rounded-2xl border text-lg font-medium transition-all
                  ${selectedTime === slot
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-black border-gray-300 hover:bg-gray-100'}
                `}
                style={{ minWidth: 0 }}
                onClick={() => setSelectedTime(slot)}
                type="button"
              >
                {slot}
              </button>
            ))}
          </div>
        </div>

        {/* Go to Checkout Button */}
        <button
          className="w-full py-3 rounded-full bg-black text-white font-semibold disabled:bg-gray-300 disabled:text-gray-500 transition"
          disabled={!selectedTime}
          onClick={handleSubmit}
        >
          Go to checkout
        </button>
      </div>
      <style jsx global>{`
        .animate-fadein {
          animation: fadein 0.5s;
        }
        @keyframes fadein {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}