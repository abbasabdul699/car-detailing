"use client";
import React, { useState } from "react";

const days = [
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
  { key: "sun", label: "Sun" },
];

export type BusinessHours = {
  [day: string]: [string, string]; // [open, close]
};

interface BusinessHoursPickerProps {
  value?: BusinessHours;
  onChange: (hours: BusinessHours) => void;
}

export default function BusinessHoursPicker({ value = {}, onChange }: BusinessHoursPickerProps) {
  const [sourceDay, setSourceDay] = useState<string>("mon");

  const handleTimeChange = (day: string, idx: 0 | 1, newTime: string) => {
    const updated: BusinessHours = { ...value };
    const currentHours = value[day] || ["", ""];
    updated[day] = [currentHours[0], currentHours[1]];
    updated[day][idx] = newTime;
    onChange(updated);
  };

  const copyHoursToAllDays = () => {
    const sourceHours = value[sourceDay];
    if (!sourceHours) return;

    const updated: BusinessHours = { ...value };
    days.forEach(({ key }) => {
      if (key !== sourceDay) {
        updated[key] = [sourceHours[0], sourceHours[1]];
      }
    });
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 mb-4">
        <select
          value={sourceDay}
          onChange={(e) => setSourceDay(e.target.value)}
          className="select select-bordered w-32"
        >
          {days.map(({ key, label }) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={copyHoursToAllDays}
          className="bg-green-700 text-white font-bold rounded-lg shadow px-3 py-1.5 text-sm transition-all duration-200 transform hover:bg-green-800 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2"
          disabled={!value[sourceDay]}
        >
          Copy Hours to All Days
        </button>
      </div>
      <div className="space-y-2">
        {days.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-2">
            <span className="w-10">{label}</span>
            <input
              type="time"
              step="600"
              value={value[key]?.[0] || ""}
              onChange={e => handleTimeChange(key, 0, e.target.value)}
              className="input input-bordered w-28"
            />
            <span>-</span>
            <input
              type="time"
              step="600"
              value={value[key]?.[1] || ""}
              onChange={e => handleTimeChange(key, 1, e.target.value)}
              className="input input-bordered w-28"
            />
          </div>
        ))}
      </div>
    </div>
  );
} 