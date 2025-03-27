'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RegisterDetailerForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    businessName: '',
    phoneNumber: '',
    firstName: '',
    lastName: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Create a clean data object
    const cleanData = {
      email: formData.email.trim(),
      password: formData.password,
      businessName: formData.businessName.trim(),
      phoneNumber: formData.phoneNumber.trim(),
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim()
    }

    // Log the exact JSON string being sent
    const jsonString = JSON.stringify(cleanData)
    console.log('Sending JSON:', jsonString)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: jsonString // Use the pre-stringified JSON
      })

      // Log raw response
      const responseText = await response.text()
      console.log('Raw response:', responseText)

      // Try to parse response
      let data
      try {
        data = JSON.parse(responseText)
      } catch (parseError) {
        console.error('Failed to parse response:', parseError)
        throw new Error('Invalid server response')
      }

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed')
      }

      // Send verification code
      const verificationResponse = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: formData.email })
      })

      if (verificationResponse.ok) {
        // Redirect to verification page
        router.push('/auth/verify')
      } else {
        throw new Error('Failed to send verification code')
      }
    } catch (err) {
      console.error('Registration error:', err)
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const validateInput = (data: RegistrationData) => {
    // Business name validation
    if (!/^[a-zA-Z0-9\s-]+$/.test(data.businessName)) {
      throw new Error('Business name can only contain letters, numbers, spaces, and hyphens')
    }

    // Email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      throw new Error('Please enter a valid email address')
    }

    // Phone number validation
    if (!/^\d{10}$/.test(data.phoneNumber.replace(/\D/g, ''))) {
      throw new Error('Please enter a valid 10-digit phone number')
    }

    // Name validation
    if (!/^[a-zA-Z\s-]+$/.test(data.firstName) || !/^[a-zA-Z\s-]+$/.test(data.lastName)) {
      throw new Error('Names can only contain letters, spaces, and hyphens')
    }

    // Password validation (at least 8 characters, one uppercase, one lowercase, one number)
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(data.password)) {
      throw new Error('Password must be at least 8 characters and include uppercase, lowercase, and numbers')
    }
  }

  return (
    <div className="max-w-md w-full space-y-8 p-6 bg-white rounded-xl shadow-md">
      <div>
        <h2 className="text-2xl font-bold text-center">Register as a Detailer</h2>
        <p className="mt-2 text-center text-gray-600">
          Create your account to start offering your services
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-500 p-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            type="email"
            name="email"
            id="email"
            required
            value={formData.email}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            type="password"
            name="password"
            id="password"
            required
            value={formData.password}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="businessName" className="block text-sm font-medium text-gray-700">
            Business Name
          </label>
          <input
            type="text"
            name="businessName"
            id="businessName"
            required
            value={formData.businessName}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">
            Phone Number
          </label>
          <input
            type="tel"
            name="phoneNumber"
            id="phoneNumber"
            required
            value={formData.phoneNumber}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
            First Name
          </label>
          <input
            type="text"
            name="firstName"
            id="firstName"
            required
            value={formData.firstName}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
            Last Name
          </label>
          <input
            type="text"
            name="lastName"
            id="lastName"
            required
            value={formData.lastName}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 ${
            loading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {loading ? 'Registering...' : 'Register'}
        </button>
      </form>
    </div>
  )
} 