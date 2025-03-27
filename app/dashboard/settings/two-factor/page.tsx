'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function TwoFactorPage() {
  const router = useRouter()
  const [verificationCode, setVerificationCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isEnabled, setIsEnabled] = useState(false)

  const handleSendCode = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/auth/2fa/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) throw new Error('Failed to send verification code')
      
      setSuccess('Verification code sent to your email')
    } catch (err) {
      setError('Failed to send verification code')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verificationCode })
      })

      if (!response.ok) throw new Error('Invalid verification code')

      setIsEnabled(true)
      setSuccess('Two-factor authentication enabled successfully!')
    } catch (err) {
      setError('Invalid verification code')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Email Two-Factor Authentication</h1>

      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        {!isEnabled ? (
          <div className="space-y-4">
            <p className="text-gray-600">
              Enable two-factor authentication using your email address for additional security.
            </p>
            
            <button
              onClick={handleSendCode}
              disabled={loading}
              className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
            >
              {loading ? 'Sending...' : 'Send Verification Code'}
            </button>

            <div className="space-y-2">
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="Enter verification code"
                className="w-full px-4 py-2 border rounded focus:ring-green-500 focus:border-green-500"
              />
              <button
                onClick={handleVerifyCode}
                disabled={loading || !verificationCode}
                className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
              >
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-green-50 p-4 rounded">
            <p className="text-green-700">
              Two-factor authentication is enabled using email.
            </p>
            <button
              onClick={() => setIsEnabled(false)}
              className="mt-2 text-sm text-red-600 hover:text-red-700"
            >
              Disable Two-Factor Authentication
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-500 p-3 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 text-green-500 p-3 rounded">
            {success}
          </div>
        )}
      </div>
    </div>
  )
} 