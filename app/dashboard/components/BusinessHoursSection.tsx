'use client';
import { useState, useEffect } from 'react';

interface BusinessHour {
  day: string;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

const defaultHours: BusinessHour[] = [
  { day: 'Monday', openTime: '09:00', closeTime: '17:00', isClosed: false },
  { day: 'Tuesday', openTime: '09:00', closeTime: '17:00', isClosed: false },
  { day: 'Wednesday', openTime: '09:00', closeTime: '17:00', isClosed: false },
  { day: 'Thursday', openTime: '09:00', closeTime: '17:00', isClosed: false },
  { day: 'Friday', openTime: '09:00', closeTime: '17:00', isClosed: false },
  { day: 'Saturday', openTime: '09:00', closeTime: '17:00', isClosed: true },
  { day: 'Sunday', openTime: '09:00', closeTime: '17:00', isClosed: true },
];

export default function BusinessHoursSection() {
  const [hours, setHours] = useState<BusinessHour[]>(defaultHours);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    fetchHours();
  }, []);

  const fetchHours = async () => {
    try {
      const response = await fetch('/api/detailers/hours');
      if (!response.ok) throw new Error('Failed to fetch hours');
      const data = await response.json();
      
      if (Array.isArray(data) && data.length > 0) {
        setHours(data);
      }
      
      setIsLoading(false);
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Failed to load business hours');
      setIsLoading(false);
    }
  };

  const handleHourChange = (index: number, field: keyof BusinessHour, value: string | boolean) => {
    const newHours = [...hours];
    newHours[index] = { ...newHours[index], [field]: value };
    setHours(newHours);
  };

  const handleSave = async () => {
    try {
      const response = await fetch('/api/detailers/hours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hours)
      });

      if (!response.ok) throw new Error('Failed to save hours');
      
      setSaveStatus('Hours saved successfully!');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (err) {
      console.error('Save error:', err);
      setError('Failed to save business hours');
    }
  };

  if (isLoading) {
    return <div className="animate-pulse">Loading hours...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Business Hours</h2>
        <button
          onClick={handleSave}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Save Hours
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-500 p-3 rounded">
          {error}
        </div>
      )}

      {saveStatus && (
        <div className="bg-green-50 text-green-500 p-3 rounded">
          {saveStatus}
        </div>
      )}

      <div className="space-y-4">
        {hours.map((hour, index) => (
          <div key={hour.day} className="grid grid-cols-4 gap-4 items-center">
            <div>{hour.day}</div>
            <div className="col-span-2 flex items-center gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={hour.isClosed}
                  onChange={(e) => handleHourChange(index, 'isClosed', e.target.checked)}
                  className="mr-2"
                />
                Closed
              </label>
              {!hour.isClosed && (
                <>
                  <input
                    type="time"
                    value={hour.openTime}
                    onChange={(e) => handleHourChange(index, 'openTime', e.target.value)}
                    className="border rounded p-2"
                    disabled={hour.isClosed}
                  />
                  <span>to</span>
                  <input
                    type="time"
                    value={hour.closeTime}
                    onChange={(e) => handleHourChange(index, 'closeTime', e.target.value)}
                    className="border rounded p-2"
                    disabled={hour.isClosed}
                  />
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 