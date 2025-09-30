"use client";
import React, { useState } from "react";
import classNames from "classnames";

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

const DEFAULT_OPEN = "09:00";
const DEFAULT_CLOSE = "17:00";

export default function BusinessHoursPicker({ value = {}, onChange }: BusinessHoursPickerProps) {
  const [sourceDay, setSourceDay] = useState<string>("mon");

  const handleTimeChange = (day: string, idx: 0 | 1, newTime: string) => {
    const updated: BusinessHours = { ...value };
    const currentHours = value[day] || ["", ""];
    updated[day] = [currentHours[0], currentHours[1]];
    updated[day][idx] = newTime;
    onChange(updated);
  };

  // Helper function to format time for display (ensures 24-hour format)
  const formatTimeForInput = (time: string) => {
    if (!time) return "";
    // Ensure the time is in HH:MM format
    if (time.includes(":")) {
      return time;
    }
    return time;
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
        {days.map(({ key, label }) => {
          const isClosed = !value[key]?.[0] && !value[key]?.[1];
          return (
            <div key={key} className="flex items-center gap-2">
              <span className="w-10">{label}</span>
              <label className="flex items-center cursor-pointer select-none">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={!isClosed}
                    onChange={e => {
                      const updated: BusinessHours = { ...value };
                      if (e.target.checked) {
                        // Set to default hours if currently closed
                        updated[key] = value[key] && value[key][0] && value[key][1]
                          ? value[key]
                          : [DEFAULT_OPEN, DEFAULT_CLOSE];
                      } else {
                        updated[key] = ["", ""];
                      }
                      onChange(updated);
                    }}
                    className="sr-only peer"
                  />
                  <div className={classNames(
                    "w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 transition-all duration-200",
                    {
                      "bg-green-600": !isClosed,
                    }
                  )}></div>
                  <div className={classNames(
                    "absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-all duration-200",
                    {
                      "translate-x-5": !isClosed,
                    }
                  )}></div>
                </div>
                <span className="ml-2 text-sm font-medium">
                  {isClosed ? "Closed" : "Open"}
                </span>
              </label>
              <input
                type="time"
                step="600"
                value={formatTimeForInput(value[key]?.[0] || "")}
                onChange={e => handleTimeChange(key, 0, e.target.value)}
                className="input input-bordered w-28 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isClosed}
                style={{ 
                  WebkitAppearance: 'none',
                  MozAppearance: 'textfield'
                }}
              />
              <span>-</span>
              <input
                type="time"
                step="600"
                value={formatTimeForInput(value[key]?.[1] || "")}
                onChange={e => handleTimeChange(key, 1, e.target.value)}
                className="input input-bordered w-28 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isClosed}
                style={{ 
                  WebkitAppearance: 'none',
                  MozAppearance: 'textfield'
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
} 