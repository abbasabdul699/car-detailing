"use client";
import { useState } from "react";

const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

export default function CalendarPage() {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };
  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      <div className="max-w-3xl mx-auto bg-white dark:bg-gray-900 rounded-xl shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Calendar</h1>
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">&lt; Prev</button>
          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{today.toLocaleString('default', { month: 'long' })} {currentYear}</div>
          <button onClick={nextMonth} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">Next &gt;</button>
        </div>
        <div className="grid grid-cols-7 gap-2 mb-2">
          {daysOfWeek.map((day) => (
            <div key={day} className="text-center font-medium text-gray-700 dark:text-gray-200">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {Array(firstDay).fill(null).map((_, i) => (
            <div key={i} />
          ))}
          {Array(daysInMonth).fill(null).map((_, i) => (
            <div key={i} className="text-center py-2 rounded bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 cursor-pointer hover:bg-teal-100 dark:hover:bg-teal-900 transition">
              {i + 1}
            </div>
          ))}
        </div>
        <div className="mt-8 text-center text-gray-400">
          {/* Placeholder for appointments/events */}
          <span>No appointments for this month.</span>
        </div>
      </div>
    </div>
  );
} 