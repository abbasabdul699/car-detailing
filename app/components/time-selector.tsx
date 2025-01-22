import React from "react"

interface TimeSelectorProps {
  onSelectTime: (time: string) => void
}

export function TimeSelector({ onSelectTime }: TimeSelectorProps) {
  const times = Array.from({ length: 11 }, (_, i) => {
    const hour = i + 9
    return `${hour % 12 || 12}:00 ${hour < 12 ? "AM" : "PM"}`
  })

  return (
    <div className="bg-white p-4 rounded-lg shadow-lg">
      <div className="space-y-2">
        {times.map((time) => (
          <button
            key={time}
            onClick={() => onSelectTime(time)}
            className="w-full text-left px-3 py-2 rounded hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {time}
          </button>
        ))}
      </div>
    </div>
  )
}

