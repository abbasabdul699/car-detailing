'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import DashboardHeader from './components/DashboardHeader'
import DashboardSidebar from './components/DashboardSidebar'
import ProfileSection from './components/ProfileSection'
import ServicesSection from './components/ServicesSection'
import BusinessHoursSection from './components/BusinessHoursSection'
import SocialMediaSection from './components/SocialMediaSection'
import ImagesSection from './components/ImagesSection'
import AnalyticsSection from './components/AnalyticsSection'
import ProfileCompletionCard from './components/ProfileCompletionCard'
import SettingsSection from './components/SettingsSection'

interface DetailerData {
  businessName: string
  firstName: string
  lastName: string
  phoneNumber: string
  email: string
  description: string
  profileImage: string
  address: string
  city: string
  state: string
  zipCode: string
}

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeSection, setActiveSection] = useState('overview')
  const [detailerData, setDetailerData] = useState<DetailerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDetailerData = async () => {
      try {
        console.log('Fetching profile data...') // Debug log
        const response = await fetch('/api/detailers/profile', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include' // Important for session cookies
        })
        
        console.log('Response status:', response.status) // Debug log
        
        if (!response.ok) {
          const errorData = await response.json()
          console.error('Error response:', errorData) // Debug log
          throw new Error(errorData.error || 'Failed to fetch profile data')
        }
        
        const data = await response.json()
        console.log('Profile data received:', data) // Debug log
        setDetailerData(data)
        setError(null)
      } catch (err) {
        console.error('Error fetching detailer data:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch profile data')
      } finally {
        setLoading(false)
      }
    }

    if (status === 'authenticated') {
      fetchDetailerData()
    } else if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  const renderActiveSection = () => {
    if (error) {
      return (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-2 text-sm underline"
          >
            Try again
          </button>
        </div>
      )
    }

    switch (activeSection) {
      case 'overview':
        return (
          <div className="space-y-6">
            <ProfileCompletionCard detailerData={detailerData} />
            <AnalyticsSection initialData={detailerData?.analytics} />
            <div className="bg-white rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
              {/* Add recent activity content here */}
            </div>
          </div>
        )
      case 'profile':
        return <ProfileSection initialData={detailerData} />
      case 'services':
        return <ServicesSection initialServices={detailerData?.services} />
      case 'photos':
        return <ImagesSection />
      case 'hours':
        return <BusinessHoursSection initialHours={detailerData?.businessHours} />
      case 'social':
        return <SocialMediaSection />
      case 'settings':
        return <SettingsSection />
      default:
        return null
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <DashboardHeader />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
        
        <div className="flex gap-8">
          <DashboardSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
          <div className="flex-1">
            {error ? (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{error}</span>
                <button 
                  onClick={() => window.location.reload()}
                  className="mt-2 text-sm text-red-700 underline"
                >
                  Try again
                </button>
              </div>
            ) : (
              renderActiveSection()
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 