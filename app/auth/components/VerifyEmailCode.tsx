'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function VerifyEmailCode() {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      })

      const data = await response.json()

      if (response.ok) {
        router.push('/dashboard?verified=true')
      } else {
        setError(data.error || 'Verification failed')
      }
    } catch (err) {
      setError('Failed to verify email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md w-full space-y-8 p-6 bg-white rounded-xl shadow-md">
      <div>
        <h2 className="text-2xl font-bold text-center">Verify Your Email</h2>
        <p className="mt-2 text-center text-gray-600">
          Enter the verification code sent to your email
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="code" className="block text-sm font-medium text-gray-700">
            Verification Code
          </label>
          <input
            id="code"
            type="text"
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter 6-digit code"
            maxLength={6}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#389167] hover:bg-[#2C7352] ${
            loading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {loading ? 'Verifying...' : 'Verify Email'}
        </button>
      </form>
    </div>
  )
} 