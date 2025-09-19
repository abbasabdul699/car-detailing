"use client";
import { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/solid';

const colorOptions = {
    blue: { label: 'Detail', class: 'bg-blue-500 ring-blue-500' },
    red: { label: 'Emergency', class: 'bg-red-500 ring-red-500' },
    green: { label: 'Meeting', class: 'bg-green-500 ring-green-500' },
    orange: { label: 'Renewal', class: 'bg-orange-500 ring-orange-500' },
    gray: { label: 'Info', class: 'bg-gray-500 ring-gray-500' },
};

type EventModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onAddEvent: (event: any) => void;
};

export default function EventModal({ isOpen, onClose, onAddEvent }: EventModalProps) {
    const [title, setTitle] = useState('');
    const [color, setColor] = useState('blue');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [isAllDay, setIsAllDay] = useState(true);

    const handleSubmit = async () => {
        if (!title || !startDate) {
            // Basic validation
            alert('Please fill in the event title and start date.');
            return;
        }

        // For timed events, validate that times are provided
        if (!isAllDay && (!startTime || !endTime)) {
            alert('Please provide both start and end times for timed events.');
            return;
        }

        try {
            // Construct the start and end datetime strings
            let startDateTime = startDate;
            let endDateTime = endDate || startDate;

            if (!isAllDay && startTime && endTime) {
                startDateTime = `${startDate}T${startTime}`;
                endDateTime = `${endDate || startDate}T${endTime}`;
            }

            const response = await fetch('/api/detailer/events', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title,
                    color,
                    startDate: startDateTime,
                    endDate: endDateTime,
                    isAllDay,
                    description: ''
                }),
            });

            const result = await response.json();

            if (response.ok) {
                // Add to local state for immediate UI update
                onAddEvent({
                    id: `local-${Date.now()}`,
                    title,
                    color,
                    date: new Date(startDate),
                    start: startDateTime,
                    end: endDateTime,
                    source: result.event.source || 'local',
                    allDay: isAllDay
                });
                
                onClose(); // Close modal after adding
                // Reset form
                setTitle('');
                setColor('blue');
                setStartDate('');
                setEndDate('');
                setStartTime('');
                setEndTime('');
                setIsAllDay(true);
                
                // Show success message
                alert('Event created successfully! It has been synced to your Google Calendar.');
            } else {
                throw new Error(result.error || 'Failed to create event');
            }
        } catch (error) {
            console.error('Error creating event:', error);
            alert('Failed to create event. Please try again.');
        }
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-2xl">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Add / Edit Event</h2>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">Plan your next big moment: schedule or edit an event to stay on track</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                        <XMarkIcon className="w-6 h-6 text-gray-500" />
                    </button>
                </div>

                <div className="mt-6 space-y-6">
                    <div>
                        <label htmlFor="event-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Event Title</label>
                        <input type="text" id="event-title" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Event Color</label>
                        <div className="flex items-center flex-wrap gap-4">
                            {Object.entries(colorOptions).map(([key, { label, class: colorClass }]) => (
                                <label key={key} className="flex items-center space-x-2 cursor-pointer">
                                    <input 
                                        type="radio" 
                                        name="event-color" 
                                        value={key}
                                        checked={color === key}
                                        onChange={() => setColor(key)}
                                        className="hidden"
                                    />
                                    <span className={`w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-offset-2 dark:ring-offset-gray-800 ${color === key ? 'ring-blue-500' : 'ring-transparent'}`}>
                                        <span className={`w-5 h-5 rounded-full ${colorClass.split(' ')[0]}`}></span>
                                    </span>
                                    <span className="text-gray-700 dark:text-gray-300">{label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* All-Day Toggle */}
                    <div>
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={isAllDay}
                                onChange={(e) => setIsAllDay(e.target.checked)}
                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">All-day event</span>
                        </label>
                    </div>

                    <div>
                        <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Enter Start Date</label>
                        <input type="date" id="start-date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="dd/mm/yyyy" />
                    </div>

                    {/* Time fields - only show if not all-day */}
                    {!isAllDay && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="start-time" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Start Time</label>
                                <input type="time" id="start-time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                            </div>
                            <div>
                                <label htmlFor="end-time" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">End Time</label>
                                <input type="time" id="end-time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                            </div>
                        </div>
                    )}

                    <div>
                        <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Enter End Date</label>
                        <input type="date" id="end-date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="dd/mm/yyyy" />
                    </div>
                </div>

                <div className="mt-8 flex justify-end space-x-4">
                    <button onClick={onClose} className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                        Close
                    </button>
                    <button onClick={handleSubmit} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                        Add Event
                    </button>
                </div>
            </div>
        </div>
    );
} 