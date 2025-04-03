'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import DetailerCard from './DetailerCard'

interface Detailer {
  id: string;
  businessName: string;
  location: {
    lat: number;
    lng: number;
  };
  priceRange: string;
  googleRating: number;
  totalReviews: number;
  images: {
    url: string;
    alt: string;
  }[];
  services: {
    name: string;
    price: number;
  }[];
  distance: number;
}

export default function SearchResults() {
  const searchParams = useSearchParams()
  const [detailers, setDetailers] = useState<Detailer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchDetailers = async () => {
      try {
        const lat = searchParams.get('lat')
        const lng = searchParams.get('lng')
        
        console.log('Client: Fetching detailers with:', { lat, lng })

        if (!lat || !lng) {
          setError('Location not provided')
          setLoading(false)
          return
        }

        const response = await fetch(`/api/detailers/search?lat=${lat}&lng=${lng}`)
        
        if (response.redirected) {
          console.error('Redirected to:', response.url)
          setError('Authentication required')
          return
        }

        if (!response.ok) {
          const errorText = await response.text()
          console.error('Server response:', errorText)
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        console.log('Received detailers:', data)
        
        if (Array.isArray(data)) {
          setDetailers(data)
        } else if (data.error) {
          throw new Error(data.error)
        } else {
          setDetailers([])
        }
      } catch (err) {
        console.error('Search results error:', err)
        setError('Failed to load detailers. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchDetailers()
  }, [searchParams])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">{error}</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">
        {detailers.length} Detailers Found Near You
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {detailers.map((detailer) => (
          <DetailerCard key={detailer.id} detailer={detailer} />
        ))}
      </div>

      {detailers.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No detailers found in your area yet.</p>
        </div>
      )}
    </div>
  )
} 