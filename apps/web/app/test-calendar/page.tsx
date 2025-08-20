'use client'
import { useState } from 'react'

export default function TestCalendarPage() {
  const [businessId, setBusinessId] = useState('689e47ec6df928b450daa9c0')
  const [date, setDate] = useState('')
  const [availability, setAvailability] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const checkAvailability = async () => {
    if (!businessId || !date) return

    setLoading(true)
    try {
      const response = await fetch(
        `/api/calendar/availability?businessId=${businessId}&date=${date}`
      )
      const data = await response.json()
      
      if (data.success) {
        setAvailability(data.data)
      } else {
        alert('Error: ' + data.error)
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to check availability')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-lg max-w-2xl w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Test Calendar Availability
        </h1>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business ID
            </label>
            <input
              type="text"
              value={businessId}
              onChange={(e) => setBusinessId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date (YYYY-MM-DD)
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <button
            onClick={checkAvailability}
            disabled={loading || !businessId || !date}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Checking...' : 'Check Availability'}
          </button>
        </div>

        {availability && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold mb-4">Availability for {date}</h2>
            <div className="grid grid-cols-3 gap-2">
              {availability.timeSlots.map((slot: any, index: number) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg text-center text-sm ${
                    slot.available
                      ? 'bg-green-100 text-green-800 border border-green-200'
                      : 'bg-red-100 text-red-800 border border-red-200'
                  }`}
                >
                  <div className="font-medium">
                    {new Date(slot.start).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                  <div className="text-xs">
                    {slot.available ? 'Available' : 'Busy'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
