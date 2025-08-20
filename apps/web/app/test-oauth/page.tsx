'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function TestOAuthPage() {
  const [businessId, setBusinessId] = useState('')

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Test Google OAuth
        </h1>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business ID (from Prisma Studio)
            </label>
            <input
              type="text"
              value={businessId}
              onChange={(e) => setBusinessId(e.target.value)}
              placeholder="Paste your business ID here"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <Link
            href={`/api/auth/google?businessId=${businessId}`}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors text-center block"
          >
            Connect Google Calendar
          </Link>
        </div>

        <div className="mt-6 text-sm text-gray-600">
          <p className="font-medium mb-2">Your Business ID:</p>
          <code className="bg-gray-100 px-2 py-1 rounded text-xs break-all">
            689e47ec6df928b450daa...
          </code>
        </div>
      </div>
    </div>
  )
}
