"use client"

import React, { useState } from "react"
import { MapPin, CalendarIcon, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Calendar } from "./calendar"
import { TimeSelector } from "./time-selector"

export function SearchForm() {
  const [showCalendar, setShowCalendar] = useState(false)
  const [showTimeSelector, setShowTimeSelector] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)
    setShowCalendar(false)
  }

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time)
    setShowTimeSelector(false)
  }

  return (
    <div className="relative w-full max-w-3xl">
      <div className="flex flex-col sm:flex-row gap-2 p-2 bg-white rounded-lg shadow-xl shadow-gray-200/50">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          <Input type="text" placeholder="Location" className="pl-10 w-full" />
        </div>
        <div className="relative flex-1">
          <CalendarIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Any date"
            className="pl-10 w-full cursor-pointer"
            value={selectedDate ? selectedDate.toLocaleDateString() : ""}
            onClick={() => setShowCalendar(!showCalendar)}
            readOnly
          />
        </div>
        <div className="relative flex-1">
          <Clock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Any time"
            className="pl-10 w-full cursor-pointer"
            value={selectedTime || ""}
            onClick={() => setShowTimeSelector(!showTimeSelector)}
            readOnly
          />
        </div>
        <Button className="bg-[#6C3EFF] hover:bg-[#5B34D9] text-white px-8">Search</Button>
      </div>
      {showCalendar && (
        <div className="absolute left-0 top-full mt-2 z-10">
          <Calendar onSelectDate={handleDateSelect} />
        </div>
      )}
      {showTimeSelector && (
        <div className="absolute right-0 top-full mt-2 z-10">
          <TimeSelector onSelectTime={handleTimeSelect} />
        </div>
      )}
    </div>
  )
}



