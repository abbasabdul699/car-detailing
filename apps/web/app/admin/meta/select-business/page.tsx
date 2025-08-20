'use client'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

interface MetaBusiness {
  id: string
  name: string
  pages: MetaPage[]
  adAccounts: MetaAdAccount[]
}

interface MetaPage {
  id: string
  name: string
  category: string
}

interface MetaAdAccount {
  id: string
  name: string
  account_status: number
}

export default function SelectMetaBusiness() {
  const searchParams = useSearchParams()
  const businessId = searchParams.get('businessId')
  
  const [businesses, setBusinesses] = useState<MetaBusiness[]>([])
  const [selectedBusiness, setSelectedBusiness] = useState<string>('')
  const [selectedPage, setSelectedPage] = useState<string>('')
  const [selectedAdAccount, setSelectedAdAccount] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)

  useEffect(() => {
    if (businessId) {
      fetchMetaBusinesses()
    }
  }, [businessId])

  const fetchMetaBusinesses = async () => {
    try {
      const response = await fetch(`/api/meta/businesses?businessId=${businessId}`)
      const data = await response.json()
      
      if (data.success) {
        setBusinesses(data.businesses)
      } else {
        console.error('Failed to fetch Meta businesses:', data.error)
      }
    } catch (error) {
      console.error('Error fetching Meta businesses:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async () => {
    if (!selectedBusiness || !selectedPage || !selectedAdAccount) {
      alert('Please select all required fields')
      return
    }

    setConnecting(true)

    try {
      const response = await fetch('/api/meta/connect-business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          metaBusinessId: selectedBusiness,
          metaPageId: selectedPage,
          metaAdAccountId: selectedAdAccount
        })
      })

      const data = await response.json()

      if (data.success) {
        alert('Successfully connected Meta Business Account!')
        window.location.href = '/admin/dashboard'
      } else {
        alert(`Failed to connect: ${data.error}`)
      }
    } catch (error) {
      console.error('Connection error:', error)
      alert('Connection failed. Please try again.')
    } finally {
      setConnecting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your Meta businesses...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Connect Meta Business Account</h1>
        
        <div className="bg-white rounded-lg shadow p-8 space-y-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Select Your Meta Assets</h2>
            <p className="text-gray-600 mt-2">
              Choose which business account, page, and ad account to connect for lead generation.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Meta Business Account *
            </label>
            <select
              value={selectedBusiness}
              onChange={(e) => {
                setSelectedBusiness(e.target.value)
                setSelectedPage('')
                setSelectedAdAccount('')
              }}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Choose a business account...</option>
              {businesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.name}
                </option>
              ))}
            </select>
          </div>

          {selectedBusiness && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Facebook Page *
              </label>
              <select
                value={selectedPage}
                onChange={(e) => setSelectedPage(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Choose a page...</option>
                {businesses
                  .find(b => b.id === selectedBusiness)
                  ?.pages.map((page) => (
                    <option key={page.id} value={page.id}>
                      {page.name} ({page.category})
                    </option>
                  ))}
              </select>
            </div>
          )}

          {selectedBusiness && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ad Account *
              </label>
              <select
                value={selectedAdAccount}
                onChange={(e) => setSelectedAdAccount(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Choose an ad account...</option>
                {businesses
                  .find(b => b.id === selectedBusiness)
                  ?.adAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} (Status: {account.account_status === 1 ? 'Active' : 'Inactive'})
                    </option>
                  ))}
              </select>
            </div>
          )}

          <div className="pt-4">
            <button
              onClick={handleConnect}
              disabled={!selectedBusiness || !selectedPage || !selectedAdAccount || connecting}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {connecting ? 'Connecting...' : 'Connect Meta Business Account'}
            </button>
          </div>

          <p className="text-sm text-gray-500 text-center">
            You can disconnect anytime from your settings
          </p>
        </div>
      </div>
    </div>
  )
}
