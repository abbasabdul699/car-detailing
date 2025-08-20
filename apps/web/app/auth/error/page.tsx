'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function ErrorPage() {
  return (
    <div className="min-h-screen bg-red-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-red-600 mb-4">
          ❌ Google Calendar Connection Failed
        </h1>
        <p className="text-gray-600">
          There was an error connecting your Google Calendar. Please try again.
        </p>
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <p className="text-sm text-gray-700">
            <strong>Possible issues:</strong>
          </p>
          <ul className="text-sm text-gray-600 mt-2 list-disc list-inside">
            <li>Database connection error</li>
            <li>Invalid business ID</li>
            <li>OAuth token exchange failed</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
