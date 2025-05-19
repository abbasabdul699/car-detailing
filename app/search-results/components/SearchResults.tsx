'use client'

import React, { useState } from 'react'
import DetailerCard from './DetailerCard'
import MapContainer from './MapContainer'
import { useSearchParams } from 'next/navigation'

interface Detailer {
  id: string;
  businessName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  description: string;
  latitude: number;
  longitude: number;
  priceRange: string;
  services: string[];
  images: { url: string; alt: string }[];
  rating?: number;
  reviewCount?: number;
  badge?: string;
  price?: string;
  driveTime?: string;
}

interface SearchResultsProps {
  detailers: Detailer[];
}

export default function SearchResults({ detailers }: SearchResultsProps) {
  const searchParams = useSearchParams()
  const [highlightedId, setHighlightedId] = useState<string | null>(null)

  const lat = parseFloat(searchParams.get('lat') || '42.0834')
  const lng = parseFloat(searchParams.get('lng') || '-71.0184')
  const location = searchParams.get('location') || ''

  return (
    <div className="relative min-h-screen flex flex-col">
      {/* MOBILE: stacked layout */}
      <div className="block lg:hidden w-full">
        <div className="w-full h-[300px]">
          <MapContainer detailers={detailers} center={{ lat, lng }} highlightedId={highlightedId} />
        </div>

        {location && (
          <div className="mb-4 mt-4 text-lg font-semibold text-gray-700 px-4">
            Showing results for: <span className="text-gray-900">{location}</span>
          </div>
        )}

        <div className="px-4 pb-8">
          <div className="grid grid-cols-1 gap-8">
            {detailers.map((detailer) => (
              <div
                key={detailer.id}
                onMouseEnter={() => setHighlightedId(detailer.id)}
                onMouseLeave={() => setHighlightedId(null)}
              >
                <DetailerCard detailer={detailer} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* DESKTOP: 2-column layout */}
      <div className="hidden lg:grid lg:grid-cols-[1fr_40vw] lg:flex-1">
        {/* Left: scrollable cards */}
        <div className="overflow-y-auto max-h-screen px-4 pt-8 pb-8">
          {location && (
            <div className="mb-6 text-lg font-semibold text-gray-700">
              Showing results for: <span className="text-gray-900">{location}</span>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {detailers.map((detailer) => (
              <div
                key={detailer.id}
                onMouseEnter={() => setHighlightedId(detailer.id)}
                onMouseLeave={() => setHighlightedId(null)}
              >
                <DetailerCard detailer={detailer} />
              </div>
            ))}
          </div>
        </div>

        {/* Right: full-height map, no padding */}
        <div className="h-screen w-full p-0 m-0">
          <MapContainer detailers={detailers} center={{ lat, lng }} highlightedId={highlightedId} />
        </div>
      </div>
    </div>
  )
}
