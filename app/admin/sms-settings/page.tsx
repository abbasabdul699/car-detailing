'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

interface DetailerSMS {
  id: string
  businessName: string
  twilioPhoneNumber: string | null
  smsEnabled: boolean
}

export default function SMSSettingsPage() {
  const { data: session } = useSession()
  const [detailers, setDetailers] = useState<DetailerSMS[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    fetchDetailers()
  }, [])

  const fetchDetailers = async () => {
    try {
      const response = await fetch('/api/admin/detailers')
      if (response.ok) {
        const data = await response.json()
        setDetailers(data.detailers || [])
      }
    } catch (error) {
      console.error('Error fetching detailers:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateSMSettings = async (detailerId: string, twilioPhoneNumber: string, smsEnabled: boolean) => {
    setUpdating(detailerId)
    try {
      const response = await fetch('/api/admin/sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          detailerId,
          twilioPhoneNumber,
          smsEnabled
        })
      })

      if (response.ok) {
        // Update local state
        setDetailers(prev => prev.map(d => 
          d.id === detailerId 
            ? { ...d, twilioPhoneNumber, smsEnabled }
            : d
        ))
        alert('SMS settings updated successfully!')
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error('Error updating SMS settings:', error)
      alert('Failed to update SMS settings')
    } finally {
      setUpdating(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading SMS settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">SMS Settings Management</h1>
            
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <h3 className="text-sm font-medium text-blue-800 mb-2">Setup Instructions:</h3>
              <ol className="text-sm text-blue-700 space-y-1">
                <li>1. Purchase a Twilio phone number for each detailer</li>
                <li>2. Set the webhook URL in Twilio Console: <code className="bg-blue-100 px-1 rounded">https://yourdomain.com/api/webhooks/twilio</code></li>
                <li>3. Enter the Twilio phone number below for each detailer</li>
                <li>4. Enable SMS for each detailer</li>
              </ol>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Detailer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Twilio Phone Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      SMS Enabled
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {detailers.map((detailer) => (
                    <tr key={detailer.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {detailer.businessName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="text"
                          placeholder="+1234567890"
                          defaultValue={detailer.twilioPhoneNumber || ''}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          id={`phone-${detailer.id}`}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <label className="inline-flex items-center">
                          <input
                            type="checkbox"
                            defaultChecked={detailer.smsEnabled}
                            className="form-checkbox h-4 w-4 text-blue-600 transition duration-150 ease-in-out"
                            id={`enabled-${detailer.id}`}
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            {detailer.smsEnabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </label>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => {
                            const phoneInput = document.getElementById(`phone-${detailer.id}`) as HTMLInputElement
                            const enabledInput = document.getElementById(`enabled-${detailer.id}`) as HTMLInputElement
                            updateSMSettings(detailer.id, phoneInput.value, enabledInput.checked)
                          }}
                          disabled={updating === detailer.id}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {updating === detailer.id ? 'Updating...' : 'Update'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {detailers.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">No detailers found.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
