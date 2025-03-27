'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'

export default function SettingsSection() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-semibold">Settings</h2>

      {/* Account Security */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h3 className="text-lg font-medium">Account Security</h3>
        <div className="space-y-4">
          <button 
            className="w-full text-left px-4 py-2 border rounded hover:bg-gray-50 flex justify-between items-center"
            onClick={() => router.push('/dashboard/settings/change-password')}
          >
            <span>Change Password</span>
            <span>→</span>
          </button>
          <button 
            className="w-full text-left px-4 py-2 border rounded hover:bg-gray-50 flex justify-between items-center"
            onClick={() => router.push('/dashboard/settings/two-factor')}
          >
            <span>Two-Factor Authentication</span>
            <span>→</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h3 className="text-lg font-medium">Notifications</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span>Email Notifications</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
            </label>
          </div>
          <div className="flex items-center justify-between">
            <span>SMS Notifications</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Privacy */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h3 className="text-lg font-medium">Privacy</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span>Profile Visibility</span>
            <select className="border rounded px-2 py-1">
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <span>Show Contact Information</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50 rounded-lg shadow p-6 space-y-4">
        <h3 className="text-lg font-medium text-red-700">Danger Zone</h3>
        <div className="space-y-4">
          <button 
            className="w-full px-4 py-2 border border-red-300 text-red-700 rounded hover:bg-red-100"
            onClick={() => {
              if (window.confirm('Are you sure you want to deactivate your account? This can be reversed later.')) {
                // Handle account deactivation
              }
            }}
          >
            Deactivate Account
          </button>
          <button 
            className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            onClick={() => {
              if (window.confirm('Are you sure you want to delete your account? This cannot be undone!')) {
                // Handle account deletion
              }
            }}
          >
            Delete Account
          </button>
        </div>
      </div>

      {/* Sign Out */}
      <div className="pt-4">
        <button 
          className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          onClick={() => signOut({ callbackUrl: '/' })}
        >
          Sign Out
        </button>
      </div>

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
  )
} 