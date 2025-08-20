'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-green-600 mb-4">
          ✅ Google Calendar Connected Successfully!
        </h1>
        <p className="text-gray-600">
          Your Google Calendar has been connected. You can now check availability and create bookings.
        </p>
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <p className="text-sm text-gray-700">
            <strong>Next steps:</strong>
          </p>
          <ul className="text-sm text-gray-600 mt-2 list-disc list-inside">
            <li>Check Prisma Studio to verify the data was saved</li>
            <li>Test calendar availability checking</li>
            <li>Create booking events</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
