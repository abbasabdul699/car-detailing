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
  subMonths 
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
};

const MonthView = ({ date, events }: { date: Date, events: any[] }) => {
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
                const dayEvents = events.filter(e => format(e.date, 'yyyy-MM-dd') === format(currentDate, 'yyyy-MM-dd'));
                return (
                    <div key={day} className="h-32 p-2 border-r border-b border-gray-200 dark:border-gray-700 flex flex-col">
                        <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{day}</div>
                        <div className="mt-1 space-y-1 overflow-y-auto">
                            {dayEvents.map((event, eventIndex) => (
                                <div key={eventIndex} className={`${eventColors[event.color]?.bg} p-1.5 rounded-md flex items-center text-xs dark:text-white`}>
                                    <div className={`w-2 h-full mr-2 rounded-l-md ${eventColors[event.color]?.border} border-l-2`}></div>
                                    <span className="truncate">{event.title}</span>
                                </div>
                            ))}
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
    const timeSlots = ['All-day', ...Array.from({ length: 20 }, (_, i) => `${i + 4}am`)];

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
                                {slot === 'All-day' && events.filter(e => format(e.date, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')).map((event, i) => (
                                    <div key={i} className={`absolute w-[95%] left-1 top-1 ${eventColors[event.color]?.bg} p-1.5 rounded-md flex items-center text-xs dark:text-white`}>
                                        <div className={`w-2 h-full mr-2 rounded-l-md ${eventColors[event.color]?.border} border-l-2`}></div>
                                        <span className="truncate">{event.title}</span>
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
    const timeSlots = ['All-day', ...Array.from({ length: 20 }, (_, i) => `${i + 4}am`)];
    const dayEvents = events.filter(e => format(e.date, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'));

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
                             {slot === 'All-day' && dayEvents.map((event, i) => (
                                <div key={i} className={`absolute w-[98%] left-1 top-1 ${eventColors[event.color]?.bg} p-1.5 rounded-md flex items-center text-xs dark:text-white`}>
                                    <div className={`w-2 h-full mr-2 rounded-l-md ${eventColors[event.color]?.border} border-l-2`}></div>
                                    <span className="truncate">{event.title}</span>
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
  
  const [bookings, setBookings] = useState<{ id: string, date: string, eventName: string, color: string }[]>([]);
  const session = useSession();
  const detailerId = session.data?.user?.id;

  useEffect(() => {
    if (detailerId) {
      const monthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
      fetch(`/api/bookings/detailer/${detailerId}?month=${monthStr}`)
        .then(res => res.json())
        .then(data => setBookings(data.bookings || []));
    }
  }, [detailerId, currentDate]);

  const handleAddEvent = (newEvent: any) => {
    setEvents([...events, newEvent]);
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
        
        {viewMode === 'month' && <MonthView date={currentDate} events={events} />}
        {viewMode === 'week' && <WeekView date={currentDate} events={events} />}
        {viewMode === 'day' && <DayView date={currentDate} events={events} />}

        <EventModal 
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onAddEvent={handleAddEvent}
        />
    </div>
  );
} 