"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "@heroicons/react/24/solid";
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  addDays, 
  subDays, 
  addMonths, 
  subMonths,
  parseISO 
} from 'date-fns';
import EventModal from './components/EventModal';

// #region Helper Functions & Components
const daysOfWeek = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

const eventColors: { [key: string]: { bg: string, border: string } } = {
  blue: { bg: 'bg-blue-100 dark:bg-blue-900', border: 'border-blue-500' },
  green: { bg: 'bg-green-100 dark:bg-green-900', border: 'border-green-500' },
  orange: { bg: 'bg-orange-100 dark:bg-orange-900', border: 'border-orange-500' },
  red: { bg: 'bg-red-100 dark:bg-red-900', border: 'border-red-500' },
  gray: { bg: 'bg-gray-100 dark:bg-gray-900', border: 'border-gray-500' },
};

const MonthView = ({ date, events, selectedEvent, onEventClick }: { date: Date, events: any[], selectedEvent: string | null, onEventClick: (eventId: string) => void }) => {
    console.log('MonthView received events:', events.length, events.map(e => ({ title: e.title, date: e.date, allDay: e.allDay, color: e.color })));
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = new Date(year, month, 1).getDay();

    return (
        <div className="grid grid-cols-7 border-t border-l border-gray-200 dark:border-gray-700">
            {daysOfWeek.map((day) => (
                <div key={day} className="py-2 text-center font-semibold text-xs text-gray-600 dark:text-gray-300 uppercase tracking-wider border-r border-b border-gray-200 dark:border-gray-700">
                    {day}
                </div>
            ))}
            {Array(firstDay).fill(null).map((_, index) => (
                <div key={`empty-${index}`} className="h-32 border-r border-b border-gray-200 dark:border-gray-700"></div>
            ))}
            {Array(daysInMonth).fill(null).map((_, index) => {
                const day = index + 1;
                const currentDate = new Date(year, month, day);
                const dayEvents = events.filter(e => {
                  const currentDateStr = format(currentDate, 'yyyy-MM-dd');
                  
                  // Check if this is a multi-day event by comparing start and end dates
                  if (e.start && e.end) {
                    const eventStart = new Date(e.start);
                    const eventEnd = new Date(e.end);
                    
                    // Check if current day falls within the event's date range
                    const currentDay = new Date(currentDate);
                    const isWithinRange = currentDay >= eventStart && currentDay <= eventEnd;
                    
                    if (isWithinRange) {
                      console.log('Multi-day event match for day', day, ':', {
                        eventTitle: e.title,
                        eventStart: e.start,
                        eventEnd: e.end,
                        currentDateStr,
                        event: e
                      });
                    }
                    return isWithinRange;
                  }
                  
                  // For single-day events, use the existing logic
                  const eventDate = format(e.date, 'yyyy-MM-dd');
                  const matches = eventDate === currentDateStr;
                  if (e.source === 'google' && matches) {
                    console.log('Single-day Google event match for day', day, ':', {
                      eventTitle: e.title,
                      eventDate,
                      currentDateStr,
                      event: e
                    });
                  }
                  return matches;
                });
                return (
                    <div key={day} className="h-32 p-2 border-r border-b border-gray-200 dark:border-gray-700 flex flex-col">
                        <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{day}</div>
                        <div className="mt-1 space-y-1 overflow-y-auto">
                            {dayEvents.map((event, eventIndex) => {
                                const isSelected = selectedEvent === event.id;
                                const baseClasses = `${eventColors[event.color]?.bg} p-1.5 rounded-md flex items-center text-xs dark:text-white cursor-pointer transition-all duration-200 hover:shadow-md`;
                                const selectedClasses = isSelected ? 'ring-2 ring-blue-500 ring-opacity-50 shadow-lg scale-105' : '';
                                
                                // For all-day events, show them at the top with a special indicator
                                if (event.allDay) {
                                    return (
                                        <div 
                                            key={eventIndex} 
                                            className={`${baseClasses} ${selectedClasses} border-l-4 ${eventColors[event.color]?.border}`}
                                            onClick={() => onEventClick(event.id)}
                                        >
                                            {event.source === 'google' && (
                                                <svg className="w-3 h-3 mr-1 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                                </svg>
                                            )}
                                            <span className="font-medium">📅 {event.title || event.eventName}</span>
                                        </div>
                                    );
                                }
                                
                                // For timed events, show them normally
                                return (
                                    <div 
                                        key={eventIndex} 
                                        className={`${baseClasses} ${selectedClasses}`}
                                        onClick={() => onEventClick(event.id)}
                                    >
                                    <div className={`w-2 h-full mr-2 rounded-l-md ${eventColors[event.color]?.border} border-l-2`}></div>
                                        {event.source === 'google' && (
                                            <svg className="w-3 h-3 mr-1 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                            </svg>
                                        )}
                                        <span className="truncate">{event.title || event.eventName}</span>
                                </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const WeekView = ({ date, events }: { date: Date, events: any[] }) => {
    const weekStart = startOfWeek(date);
    const weekEnd = endOfWeek(date);
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
    // Generate time slots: All-day, 4am-11am, 12pm-11pm
    const timeSlots = ['All-day'];
    for (let hour = 4; hour <= 11; hour++) {
        timeSlots.push(`${hour}am`);
    }
    timeSlots.push('12pm');
    for (let hour = 1; hour <= 11; hour++) {
        timeSlots.push(`${hour}pm`);
    }

    return (
        <div className="flex border-t border-l border-gray-200 dark:border-gray-700">
            <div className="w-20 border-r border-gray-200 dark:border-gray-700">
                {timeSlots.map(slot => (
                    <div key={slot} className="h-16 flex items-center justify-center text-xs text-gray-500 border-b border-gray-200 dark:border-gray-700">
                        {slot}
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-7 flex-1">
                {weekDays.map(day => (
                    <div key={day.toString()} className="border-r border-gray-200 dark:border-gray-700">
                         <div className="text-center py-2 text-xs font-semibold uppercase border-b border-gray-200 dark:border-gray-700">
                            {format(day, 'EEE')} <span className="text-gray-800 dark:text-white">{format(day, 'M/d')}</span>
                        </div>
                        {timeSlots.map(slot => (
                             <div key={slot} className="h-16 border-b border-gray-200 dark:border-gray-700 relative">
                                {/* Show all-day events */}
                                {slot === 'All-day' && events.filter(e => {
                                    if (!e.allDay) return false;
                                    
                                    // Check if this is a multi-day event by comparing start and end dates
                                    const eventStart = new Date(e.start);
                                    const eventEnd = new Date(e.end);
                                    const currentDay = new Date(day);
                                    
                                    // If we have both start and end dates, check if current day falls within the range
                                    if (e.start && e.end && eventStart && eventEnd) {
                                        // Check if current day is between start and end (inclusive)
                                        return currentDay >= eventStart && currentDay <= eventEnd;
                                    }
                                    
                                    // For single-day events, use the existing logic
                                    return format(e.date, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
                                }).map((event, i) => (
                                    <div key={i} className={`absolute w-[95%] left-1 top-1 ${eventColors[event.color]?.bg} p-1.5 rounded-md flex items-center text-xs dark:text-white`}>
                                        <div className={`w-2 h-full mr-2 rounded-l-md ${eventColors[event.color]?.border} border-l-2`}></div>
                                        {event.source === 'google' && (
                                            <svg className="w-3 h-3 mr-1 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                            </svg>
                                        )}
                                        <span className="truncate">{event.title || event.eventName}</span>
                                    </div>
                                ))}
                                
                                {/* Show timed events in their appropriate time slots */}
                                {slot !== 'All-day' && events.filter(e => {
                                    // Skip all-day events
                                    if (e.allDay) return false;
                                    
                                    // Check if event is on the current day
                                    const eventStartDate = e.start ? e.start.split('T')[0] : '';
                                    const currentDateStr = format(day, 'yyyy-MM-dd');
                                    if (eventStartDate !== currentDateStr) return false;
                                    
                                    // Extract hour from start time (e.g., "2025-09-17T10:00:00" -> "10")
                                    const startTime = e.start;
                                    if (!startTime || typeof startTime !== 'string') return false;
                                    
                                    // Parse the time from the datetime string
                                    const timeMatch = startTime.match(/T(\d{1,2}):/);
                                    if (!timeMatch) return false;
                                    
                                    const hour = parseInt(timeMatch[1]);
                                    
                                    // Map the hour to the correct time slot
                                    // Time slots are: All-day, 4am, 5am, ..., 11pm
                                    const slotHour = parseInt(slot.replace(/am|pm/, ''));
                                    const isPM = slot.includes('pm');
                                    
                                    // Convert 24-hour format to 12-hour format for comparison
                                    let eventHour12 = hour;
                                    let eventIsPM = false;
                                    
                                    if (hour === 0) {
                                        eventHour12 = 12; // Midnight
                                        eventIsPM = false;
                                    } else if (hour === 12) {
                                        eventHour12 = 12; // Noon
                                        eventIsPM = true;
                                    } else if (hour > 12) {
                                        eventHour12 = hour - 12;
                                        eventIsPM = true;
                                    } else {
                                        eventHour12 = hour;
                                        eventIsPM = false;
                                    }
                                    
                                    return eventHour12 === slotHour && eventIsPM === isPM;
                                }).map((event, i) => (
                                    <div key={i} className={`absolute w-[95%] left-1 top-1 ${eventColors[event.color]?.bg} p-1.5 rounded-md flex items-center text-xs dark:text-white`}>
                                        <div className={`w-2 h-full mr-2 rounded-l-md ${eventColors[event.color]?.border} border-l-2`}></div>
                                        {event.source === 'google' && (
                                            <svg className="w-3 h-3 mr-1 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                            </svg>
                                        )}
                                        <span className="truncate">{event.title || event.eventName}</span>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
};

const DayView = ({ date, events }: { date: Date, events: any[] }) => {
    // Generate time slots: All-day, 4am-11am, 12pm-11pm
    const timeSlots = ['All-day'];
    for (let hour = 4; hour <= 11; hour++) {
        timeSlots.push(`${hour}am`);
    }
    timeSlots.push('12pm');
    for (let hour = 1; hour <= 11; hour++) {
        timeSlots.push(`${hour}pm`);
    }
    
    const dayEvents = events.filter(e => {
        // Check if event is on the current day
        const eventStartDate = e.start ? e.start.split('T')[0] : '';
        const currentDateStr = format(date, 'yyyy-MM-dd');
        return eventStartDate === currentDateStr;
    });

    return (
        <div className="flex border-t border-l border-gray-200 dark:border-gray-700">
            <div className="w-20 border-r border-gray-200 dark:border-gray-700">
                {timeSlots.map(slot => (
                    <div key={slot} className="h-16 flex items-center justify-center text-xs text-gray-500 border-b border-gray-200 dark:border-gray-700">
                        {slot}
                    </div>
                ))}
            </div>
            <div className="flex-1">
                <div className="border-r border-gray-200 dark:border-gray-700">
                    <div className="text-center py-2 text-xs font-semibold uppercase border-b border-gray-200 dark:border-gray-700">
                        {format(date, 'EEE')} <span className="text-gray-800 dark:text-white">{format(date, 'M/d')}</span>
                    </div>
                    {timeSlots.map(slot => (
                        <div key={slot} className="h-16 border-b border-r border-gray-200 dark:border-gray-700 relative">
                            {/* Show all-day events */}
                            {slot === 'All-day' && dayEvents.filter(e => e.allDay).map((event, i) => (
                                <div key={i} className={`absolute w-[98%] left-1 top-1 ${eventColors[event.color]?.bg} p-1.5 rounded-md flex items-center text-xs dark:text-white`}>
                                    <div className={`w-2 h-full mr-2 rounded-l-md ${eventColors[event.color]?.border} border-l-2`}></div>
                                    {event.source === 'google' && (
                                        <svg className="w-3 h-3 mr-1 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                        </svg>
                                    )}
                                    <span className="truncate">{event.title || event.eventName}</span>
                                </div>
                            ))}
                            
                            {/* Show timed events in their appropriate time slots */}
                            {slot !== 'All-day' && dayEvents.filter(e => {
                                // Skip all-day events
                                if (e.allDay) return false;
                                
                                // Extract hour from start time (e.g., "2025-09-17T10:00:00" -> "10")
                                const startTime = e.start;
                                if (!startTime || typeof startTime !== 'string') return false;
                                
                                // Parse the time from the datetime string
                                const timeMatch = startTime.match(/T(\d{1,2}):/);
                                if (!timeMatch) return false;
                                
                                const hour = parseInt(timeMatch[1]);
                                
                                // Map the hour to the correct time slot
                                const slotHour = parseInt(slot.replace(/am|pm/, ''));
                                const isPM = slot.includes('pm');
                                
                                // Convert 24-hour format to 12-hour format for comparison
                                let eventHour12 = hour;
                                let eventIsPM = false;
                                
                                if (hour === 0) {
                                    eventHour12 = 12; // Midnight
                                    eventIsPM = false;
                                } else if (hour === 12) {
                                    eventHour12 = 12; // Noon
                                    eventIsPM = true;
                                } else if (hour > 12) {
                                    eventHour12 = hour - 12;
                                    eventIsPM = true;
                                } else {
                                    eventHour12 = hour;
                                    eventIsPM = false;
                                }
                                
                                return eventHour12 === slotHour && eventIsPM === isPM;
                            }).map((event, i) => (
                                <div key={i} className={`absolute w-[98%] left-1 top-1 ${eventColors[event.color]?.bg} p-1.5 rounded-md flex items-center text-xs dark:text-white`}>
                                    <div className={`w-2 h-full mr-2 rounded-l-md ${eventColors[event.color]?.border} border-l-2`}></div>
                                    {event.source === 'google' && (
                                        <svg className="w-3 h-3 mr-1 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                        </svg>
                                    )}
                                    <span className="truncate">{event.title || event.eventName}</span>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
// #endregion

export default function CalendarPage() {
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);

  const today = new Date();
  const [events, setEvents] = useState([
    { date: addDays(today, 1), title: 'Team Sync', color: 'blue' },
    { date: addDays(today, 2), title: 'Creative Brainstorming Session', color: 'blue' },
    { date: today, title: 'Interview with John', color: 'green' },
    { date: addDays(today, -5), title: 'Design Review', color: 'orange' },
    { date: addDays(today, 10), title: 'Project Kick-off', color: 'red' },
  ]);
  
  const [bookings, setBookings] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [eventDetailsOpen, setEventDetailsOpen] = useState(false);
  const [selectedEventData, setSelectedEventData] = useState<any>(null);
  const session = useSession();
  const detailerId = session.data?.user?.id;
  
  console.log('Session status:', session.status, 'Session data:', session.data);
  
  console.log('Calendar component render - bookings state:', bookings.length, bookings.map(b => ({ title: b.title, date: b.date, allDay: b.allDay, color: b.color })));

  useEffect(() => {
    console.log('useEffect triggered - detailerId:', detailerId, 'session status:', session.status, 'currentDate:', currentDate);
    if (detailerId && session.status === 'authenticated') {
      fetchCalendarEvents();
    }
  }, [detailerId, currentDate, session.status]);

  // Show loading state while session is loading
  if (session.status === 'loading') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600 dark:text-gray-400">Loading calendar...</div>
      </div>
    );
  }
  
  // Show error state if not authenticated
  if (session.status === 'unauthenticated') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600 dark:text-red-400">Please log in to view your calendar.</div>
      </div>
    );
  }

  const fetchCalendarEvents = async () => {
    if (!detailerId || session.status !== 'authenticated') return;
    
      const monthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    
    try {
      // Fetch both local bookings and Google Calendar events
      const [localBookings, googleEvents] = await Promise.all([
        // Fetch local bookings
      fetch(`/api/bookings/detailer/${detailerId}?month=${monthStr}`)
          .then(res => {
            if (!res.ok) {
              console.log('Local bookings API returned:', res.status, res.statusText);
              return { bookings: [] };
            }
            return res.json();
          })
          .then(data => data.bookings || [])
          .catch(error => {
            console.log('Error fetching local bookings:', error);
            return [];
          }),
        
        // Fetch Google Calendar events
        fetch('/api/detailer/calendar-events')
          .then(res => {
            console.log('Google Calendar API response status:', res.status);
            return res.json();
          })
          .then(data => {
            console.log('Google Calendar API response data:', data);
            return data.events || [];
          })
          .catch(error => {
            console.error('Error fetching Google Calendar events:', error);
            return [];
          })
      ]);

      // Transform and combine events (googleEvents already contains both Google and local events)
      const allEvents = googleEvents.map((event: any) => {
        // Preserve the original source field from the API
        const eventSource = event.source;
        let eventColor = 'blue'; // Default for Google events
        
        // Set color based on source
        if (eventSource === 'local-google-synced' || eventSource === 'local') {
          eventColor = event.color || 'green';
        }
        
        return {
          ...event,
          source: eventSource, // Preserve original source
          color: eventColor,
          date: event.start ? (event.allDay ? parseISO(event.start) : parseISO(event.start.split('T')[0])) : new Date(),
          start: event.start,
          end: event.end,
          allDay: event.allDay,
          isMultiDay: event.isMultiDay
        };
      });
      
      console.log('Setting bookings state with:', allEvents.length, 'events');
      console.log('Event sources:', allEvents.map(e => ({ title: e.title, source: e.source, color: e.color })));
      setBookings(allEvents);
    } catch (error) {
      console.error('Error fetching calendar events:', error);
    }
  };

  const handleAddEvent = (newEvent: any) => {
    setEvents([...events, newEvent]);
    // Refresh the calendar events to include the new event
    fetchCalendarEvents();
  };

  const handleEventClick = (eventId: string) => {
    const eventData = bookings.find(event => event.id === eventId);
    if (eventData) {
      setSelectedEvent(eventId);
      setSelectedEventData(eventData);
      setEventDetailsOpen(true);
    }
  };

  const handleCloseEventDetails = () => {
    setEventDetailsOpen(false);
    setSelectedEvent(null);
    setSelectedEventData(null);
  };

  const handleDeleteEvent = async () => {
    if (!selectedEventData?.id) return;
    
    const confirmDelete = window.confirm(
      'Are you sure you want to delete this event? This will remove it from both Reeva Detailer and Google Calendar.'
    );
    
    if (!confirmDelete) return;

    try {
      const response = await fetch(`/api/detailer/events/${selectedEventData.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Refresh the calendar events
        fetchCalendarEvents();
        // Close the modal
        handleCloseEventDetails();
        // Show success message
        alert('Event deleted successfully!');
      } else {
        const error = await response.json();
        alert(`Failed to delete event: ${error.error}`);
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event. Please try again.');
    }
  };

  const handlePrev = () => {
      if (viewMode === 'month') setCurrentDate(subMonths(currentDate, 1));
      else if (viewMode === 'week') setCurrentDate(subDays(currentDate, 7));
      else setCurrentDate(subDays(currentDate, 1));
  };

  const handleNext = () => {
      if (viewMode === 'month') setCurrentDate(addMonths(currentDate, 1));
      else if (viewMode === 'week') setCurrentDate(addDays(currentDate, 7));
      else setCurrentDate(addDays(currentDate, 1));
  };

  const renderHeaderDate = () => {
    if (viewMode === 'month') return format(currentDate, 'MMMM yyyy');
    if (viewMode === 'week') {
        const weekStart = startOfWeek(currentDate);
        const weekEnd = endOfWeek(currentDate);
        return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'd, yyyy')}`;
    }
    return format(currentDate, 'MMMM d, yyyy');
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-semibold text-gray-800 dark:text-white">Calendar</h1>
            <div className="text-sm text-gray-500 dark:text-gray-400">
                Home &gt; <span className="text-gray-800 dark:text-white">Calendar</span>
            </div>
        </div>

        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
                <button onClick={handlePrev} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
                    <ChevronLeftIcon className="w-5 h-5 text-gray-500 dark:text-gray-300" />
                </button>
                <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200">
                    {renderHeaderDate()}
                </h2>
                <button onClick={handleNext} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
                    <ChevronRightIcon className="w-5 h-5 text-gray-500 dark:text-gray-300" />
                </button>
            </div>
            <div className="flex items-center space-x-4">
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                    <PlusIcon className="w-5 h-5 mr-2" />
                    Add Event
                </button>
                <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-md p-1">
                    {(['month', 'week', 'day'] as const).map(view => (
                         <button 
                            key={view}
                            onClick={() => setViewMode(view)}
                            className={`px-3 py-1 text-sm font-medium rounded-md capitalize ${viewMode === view ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow' : 'text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                        >
                            {view}
                        </button>
                    ))}
                </div>
            </div>
        </div>
        
        {viewMode === 'month' && <MonthView date={currentDate} events={bookings} selectedEvent={selectedEvent} onEventClick={handleEventClick} />}
        {viewMode === 'week' && <WeekView date={currentDate} events={bookings} />}
        {viewMode === 'day' && <DayView date={currentDate} events={bookings} />}

        <EventModal 
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onAddEvent={handleAddEvent}
        />

        {/* Event Details Modal */}
        {eventDetailsOpen && selectedEventData && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    {selectedEventData.source === 'google' && (
                      <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    )}
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {selectedEventData.title || selectedEventData.eventName}
                    </h3>
                  </div>
                  <button
                    onClick={handleCloseEventDetails}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Event Details */}
                <div className="space-y-4">
                  {/* Date and Time */}
                  <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm">
                      {selectedEventData.allDay 
                        ? format(parseISO(selectedEventData.start), 'EEEE, MMMM d, yyyy')
                        : `${format(parseISO(selectedEventData.start), 'EEEE, MMMM d • h:mm a')} - ${format(parseISO(selectedEventData.end || selectedEventData.start), 'h:mm a')}`
                      }
                    </span>
                  </div>

                  {/* Event Type */}
                  <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    <span className="text-sm">
                      {selectedEventData.allDay ? 'All-day event' : 'Timed event'}
                    </span>
                  </div>

                  {/* Source */}
                  <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <span className="text-sm">
                      {selectedEventData.source === 'google' ? 'Google Calendar' : 'Local event'}
                    </span>
                  </div>

                  {/* Description if available */}
                  {selectedEventData.description && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Description</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{selectedEventData.description}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={handleCloseEventDetails}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Close
                  </button>
                  
                  {/* Show delete button for local events */}
                  {(selectedEventData.source === 'local' || selectedEventData.source === 'local-google-synced') && (
                    <button
                      onClick={handleDeleteEvent}
                      className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Delete Event
                    </button>
                  )}
                  
                  {/* Show Google Calendar button for Google events */}
                  {selectedEventData.source === 'google' && (
                    <button
                      onClick={() => window.open('https://calendar.google.com', '_blank')}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Open in Google Calendar
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
} 