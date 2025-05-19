'use client'

import React, { useState, useRef, useEffect } from 'react'
import DetailerCard from './DetailerCard'
import MapContainer from './MapContainer'
import Footer from '@/app/components/Footer'
import { useSearchParams } from 'next/navigation'

interface DetailerImage {
  url: string;
  alt: string;
}

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
  images: DetailerImage[];
  rating?: number;
  reviewCount?: number;
  badge?: string;
  price?: string;
  driveTime?: string;
}

interface SearchResultsClientProps {
  detailers: Detailer[];
}

export default function SearchResultsClient({ detailers }: SearchResultsClientProps) {
  const searchParams = useSearchParams()
  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  const [footerHeight, setFooterHeight] = useState(0)
  const [mapInteractive, setMapInteractive] = useState(false)
  const mapRef = useRef<HTMLDivElement>(null)

  // Parse lat/lng from searchParams
  const lat = parseFloat(searchParams.get('lat') || '42.0834')
  const lng = parseFloat(searchParams.get('lng') || '-71.0184')
  const location = searchParams.get('location') || ''
  console.log('Map center:', { lat, lng })

  console.log('window.location.href:', typeof window !== 'undefined' ? window.location.href : 'server')
  console.log('searchParams:', searchParams)

  useEffect(() => {
    function updateFooterHeight() {
      const footer = document.querySelector('footer');
      if (footer) {
        setFooterHeight((footer as HTMLElement).offsetHeight);
      }
    }
    updateFooterHeight();
    window.addEventListener('resize', updateFooterHeight);
    return () => window.removeEventListener('resize', updateFooterHeight);
  }, []);

  useEffect(() => {
    if (!mapInteractive) return;
    function handleClickOutside(event: MouseEvent) {
      if (mapRef.current && !mapRef.current.contains(event.target as Node)) {
        setMapInteractive(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [mapInteractive]);

  return (
    <div className="relative min-h-screen flex flex-col">
      <div className="flex-1 flex">
        {/* Card grid: full width, but with right margin so cards don't go under the map */}
        <div
          className="relative z-10 px-4 pt-8 pb-8 flex-1"
          style={{
            maxWidth: 'calc(100% - 40vw)',
          }}
        >
          {/* Show the searched address/location above the cards */}
          {location && (
            <div className="mb-6 text-lg font-semibold text-gray-700">
              Showing results for: <span className="text-gray-900">{location}</span>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
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

        {/* Map: fixed on the right for large screens */}
        <div
          ref={mapRef}
          className="hidden lg:block fixed top-0 right-0"
          style={{
            width: '40vw',
            height: '100vh',
            zIndex: 20,
            marginBottom: `${footerHeight}px`,
          }}
          onMouseEnter={() => setMapInteractive(true)}
          onMouseLeave={() => setMapInteractive(false)}
        >
          <div 
            className="absolute inset-0"
            style={{
              pointerEvents: mapInteractive ? 'auto' : 'none',
              backgroundColor: mapInteractive ? 'transparent' : 'rgba(255, 255, 255, 0.6)',
              cursor: mapInteractive ? 'grab' : 'pointer',
              transition: 'background-color 0.2s ease',
            }}
            onClick={() => setMapInteractive(true)}
          >
            {!mapInteractive && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-gray-700 font-medium">Click to interact with the map</span>
              </div>
            )}
          </div>
          <MapContainer detailers={detailers} center={{ lat, lng }} highlightedId={highlightedId} />
        </div>
      </div>
    </div>
  )
} 