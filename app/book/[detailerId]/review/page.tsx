'use client';

import { useState, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { useRouter, useSearchParams } from 'next/navigation';

const timeSlots = {
  morning: ['8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM'],
  afternoon: ['12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM'],
  evening: ['6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM'],
};

export default function ReviewPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get vehicle and service info from query params
  const brand = searchParams.get('brand');
  const model = searchParams.get('model');
  const year = searchParams.get('year');
  const type = searchParams.get('type');
  const condition = searchParams.get('condition');
  const services = searchParams.get('service')?.split(',') || [];

  const detailerId = searchParams.get('detailerId'); // Try to get from searchParams

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (showSummary) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showSummary]);

  return (
    <div className="flex flex-col md:flex-row gap-10 md:gap-8 p-2 sm:p-4 md:p-12 w-full min-h-screen bg-gray-50 items-start justify-center relative pt-16">
      {/* Main Content */}
      <div className="flex-1 bg-white rounded-lg shadow p-2 sm:p-4 md:p-6 flex flex-col w-full max-w-full md:max-w-none overflow-x-auto md:mt-8">
        {/* Heading row with back button and title */}
        <div className="flex items-center w-full gap-x-2 mb-4">
          <button
            onClick={() => {
              if (detailerId) {
                router.push(`/book/${detailerId}/condition`);
              } else {
                router.back();
              }
            }}
            className="self-start text-gray-500 hover:text-black text-3xl"
            type="button"
          >
            &larr;
          </button>
          <h2 className="flex-1 text-xl font-semibold text-center">Select a date</h2>
        </div>
        <div
          className="big-calendar md:scale-150 md:origin-top-left w-full max-w-xs sm:max-w-sm md:max-w-none"
          style={{
            ['--rdp-accent-color' as any]: 'green',
            ['--rdp-selected-border' as any]: '2px solid green',
          }}
        >
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            fromDate={new Date()}
            required={false}
          />
        </div>
        {selectedDate && (
          <div className="mt-8 md:mt-48 w-full">
            <h3 className="font-medium mb-2">Select a time</h3>
            <div className="mb-2">
              <span className="font-semibold">Morning</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {timeSlots.morning.map((slot) => (
                  <button
                    key={slot}
                    className={`px-4 py-2 rounded border min-w-[90px] text-base ${selectedTime === slot ? 'bg-black text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                    onClick={() => setSelectedTime(slot)}
                  >
                    <img src="https://reevacar.s3.us-east-2.amazonaws.com/review-page-icons/sunny-day.svg" alt="Sun" className={`inline-block w-5 h-5 mr-1 align-middle${selectedTime === slot ? ' filter invert brightness-200' : ''}`} />{slot}
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-2">
              <span className="font-semibold">Afternoon</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {timeSlots.afternoon.map((slot) => (
                  <button
                    key={slot}
                    className={`px-4 py-2 rounded border min-w-[90px] text-base ${selectedTime === slot ? 'bg-black text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                    onClick={() => setSelectedTime(slot)}
                  >
                    <img src="https://reevacar.s3.us-east-2.amazonaws.com/review-page-icons/sunset.svg" alt="Sunset" className={`inline-block w-5 h-5 mr-1 align-middle${selectedTime === slot ? ' filter invert brightness-200' : ''}`} />{slot}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="font-semibold">Evening</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {timeSlots.evening.map((slot) => (
                  <button
                    key={slot}
                    className={`px-4 py-2 rounded border min-w-[90px] text-base ${selectedTime === slot ? 'bg-black text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                    onClick={() => setSelectedTime(slot)}
                  >
                    <img src="https://reevacar.s3.us-east-2.amazonaws.com/review-page-icons/night-mode.svg" alt="Moon" className={`inline-block w-5 h-5 mr-1 align-middle${selectedTime === slot ? ' filter invert brightness-200' : ''}`} />{slot}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Desktop Appointment Summary */}
      <div className="hidden md:block w-full md:w-[400px] bg-white rounded-lg shadow p-2 sm:p-4 md:p-6 h-fit mt-8">
        <div className="flex items-center gap-2 mb-4">
          {/* Calendar SVG icon */}
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-gray-700">
            <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
            <path stroke="currentColor" strokeWidth="1.5" d="M16 3v4M8 3v4M3 9h18"/>
          </svg>
          <h2 className="text-lg font-semibold">Appointment summary</h2>
        </div>
        <div className="border rounded p-4 mb-4">
          <div className="mb-2">
            <span className="font-bold text-base md:text-lg md:text-black text-white">Vehicle:</span>
            <ul className="ml-4 mt-1 list-disc">
              {brand && <li><span className="font-semibold">Brand:</span> {brand}</li>}
              {model && <li><span className="font-semibold">Model:</span> {model}</li>}
              {year && <li><span className="font-semibold">Year:</span> {year}</li>}
              {type && <li><span className="font-semibold">Type:</span> {type}</li>}
              {condition && <li><span className="font-semibold">Condition:</span> {condition}</li>}
            </ul>
          </div>
          <div className="mb-2">
            <span className="font-bold text-base md:text-lg md:text-black text-white">Services:</span>
            <ul className="ml-4 mt-1 list-disc">
              {services.length > 0 ? services.map((s, idx) => (
                <li key={idx} className="text-base">{s}</li>
              )) : <li className="text-base text-gray-400">No services selected</li>}
            </ul>
          </div>
        </div>
        <button
          className="w-full py-3 rounded-full bg-black text-white font-semibold disabled:bg-gray-300 disabled:text-gray-500 transition"
          disabled={!selectedDate || !selectedTime}
          onClick={() => {
            router.push(`/book/checkout`);
          }}
        >
          <img
            src="https://reevacar.s3.us-east-2.amazonaws.com/review-page-icons/check.svg"
            alt="Checkout"
            className="inline-block w-5 h-5 mr-2 align-middle filter invert"
          />
          Go to Checkout
        </button>
      </div>
      {/* Mobile: Fixed View Order Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 p-4 bg-transparent flex justify-center">
        <button
          className="w-full max-w-md mx-auto py-4 rounded-2xl bg-black text-white font-semibold text-lg flex items-center justify-between px-6 shadow-lg"
          onClick={() => setShowSummary(true)}
        >
          View Booking
          <span className="text-gray-300 font-normal ml-2">Summary</span>
        </button>
      </div>
      {/* Mobile: Bottom Sheet Modal */}
      {showSummary && (
        <div className="md:hidden fixed inset-0 z-50 flex items-end justify-center bg-black bg-opacity-60 transition-all">
          <div className="w-full max-w-md bg-black rounded-t-3xl p-6 pb-10 relative animate-slideup">
            <button
              className="absolute top-4 right-4 text-white text-2xl"
              onClick={() => setShowSummary(false)}
              aria-label="Close summary"
            >
              &times;
            </button>
            <h2 className="text-2xl font-bold mb-4 text-white">Your Order</h2>
            <div className="border border-gray-700 rounded p-4 mb-4 bg-gray-900">
              <div className="mb-2">
                <span className="font-bold text-base md:text-lg md:text-black text-white">Vehicle:</span>
                <ul className="ml-4 mt-1 list-disc text-gray-200">
                  {brand && <li><span className="font-semibold">Brand:</span> {brand}</li>}
                  {model && <li><span className="font-semibold">Model:</span> {model}</li>}
                  {year && <li><span className="font-semibold">Year:</span> {year}</li>}
                  {type && <li><span className="font-semibold">Type:</span> {type}</li>}
                  {condition && <li><span className="font-semibold">Condition:</span> {condition}</li>}
                </ul>
              </div>
              <div className="mb-2">
                <span className="font-bold text-base md:text-lg md:text-black text-white">Services:</span>
                <ul className="ml-4 mt-1 list-disc text-gray-200">
                  {services.length > 0 ? services.map((s, idx) => (
                    <li key={idx} className="text-base">{s}</li>
                  )) : <li className="text-base text-gray-400">No services selected</li>}
                </ul>
              </div>
            </div>
            <button
              className="w-full py-3 rounded-full bg-white text-black font-semibold disabled:bg-gray-300 disabled:text-gray-500 transition"
              disabled={!selectedDate || !selectedTime}
              onClick={() => {
                setShowSummary(false);
                router.push(`/book/checkout`);
              }}
            >
              <img
                src="https://reevacar.s3.us-east-2.amazonaws.com/review-page-icons/check.svg"
                alt="Checkout"
                className="inline-block w-5 h-5 mr-2 align-middle"
              />
              Go to checkout
            </button>
          </div>
        </div>
      )}
      <style jsx global>{`
        @keyframes slideup {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slideup {
          animation: slideup 0.3s cubic-bezier(0.4,0,0.2,1);
        }
        /* Selected day (force border and color) */
        .rdp-day_selected[aria-selected="true"],
        .rdp-day_selected[aria-selected="true"]:focus,
        .rdp-day_selected[aria-selected="true"]:focus-visible,
        .rdp-day_selected.rdp-day_button[aria-selected="true"] {
          border: 2px solid #006400 !important;
          color: #006400 !important;
          background: #e6f4ea !important;
          border-radius: 9999px !important;
          box-shadow: none !important;
          outline: none !important;
        }
        /* Today (force border and color) */
        .rdp-day_today,
        .rdp-day_today:focus,
        .rdp-day_today:focus-visible,
        .rdp-day_today.rdp-day_button {
          border: 2px solid #006400 !important;
          color: #006400 !important;
          background: #e6f4ea !important;
          border-radius: 9999px !important;
          box-shadow: none !important;
          outline: none !important;
        }
        /* Navigation arrows */
        .rdp-nav_button,
        .rdp-nav_button:focus,
        .rdp-nav_button:active {
          color: #006400 !important;
          fill: #006400 !important;
          background: transparent !important;
          border: none !important;
        }
        .rdp-nav_button:hover {
          background: #e6f4ea !important;
          color: #004d1a !important;
          fill: #004d1a !important;
        }
      `}</style>
    </div>
  );
}