"use client"

import React, { useState, useMemo } from 'react'
import DetailerCard from './DetailerCard'
import MapContainer from './MapContainer'
import { useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import FilterBar, { FilterOptions } from './FilterBar'
import { FunnelIcon } from '@heroicons/react/24/outline'

const MobileBottomSheet = dynamic(() => import('./MobileBottomSheet'), { ssr: false });

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
  _distance?: number;
  verified: boolean;
}

interface SearchResultsProps {
  detailers: Detailer[];
}

// Haversine formula to calculate distance in km
function getDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (x: number) => x * Math.PI / 180;
  const R = 6371; // Radius of Earth in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export default function SearchResults({ detailers }: SearchResultsProps) {
  const searchParams = useSearchParams()
  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    priceRange: [],
    selectedServices: [],
    maxDistance: 50,
  });
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [sortOrder, setSortOrder] = useState('relevance');

  const lat = parseFloat(searchParams.get('lat') || '42.0834')
  const lng = parseFloat(searchParams.get('lng') || '-71.0184')
  const location = searchParams.get('location') || ''

  // Get unique services from all detailers
  const allServices = useMemo(() => {
    const services = new Set<string>();
    detailers.forEach(detailer => {
      (detailer.services ?? []).forEach(service => services.add(service));
    });
    return Array.from(services);
  }, [detailers]);

  // Recalculate _distance for each detailer when location or detailers change
  const detailersWithDistance = useMemo(() => {
    return detailers.map(d => ({
      ...d,
      _distance: getDistance(lat, lng, d.latitude, d.longitude)
    }));
  }, [detailers, lat, lng]);

  // Price range mapping for sorting
  const priceMap: Record<string, number> = { '$': 1, '$$': 2, '$$$': 3, '$$$$': 4 };

  // Filter detailers based on selected criteria
  const filteredDetailers = useMemo(() => {
    let result = detailersWithDistance.filter(detailer => {
      // Filter by price range
      if (filters.priceRange.length > 0 && !filters.priceRange.includes(detailer.priceRange)) {
        return false;
      }

      // Filter by services
      if (filters.selectedServices.length > 0) {
        const hasAllSelectedServices = filters.selectedServices.every(service =>
          detailer.services.includes(service)
        );
        if (!hasAllSelectedServices) {
          return false;
        }
      }

      // Filter by distance (convert miles to km)
      if (detailer._distance && detailer._distance > filters.maxDistance * 1.60934) {
        return false;
      }

      // Filter by verified only
      if (
        filters.verifiedOnly &&
        !detailer.verified
      ) {
        return false;
      }

      return true;
    });

    // Sort by price if needed
    if (sortOrder === 'price-asc') {
      result = result.slice().sort((a, b) => (priceMap[a.priceRange] || 0) - (priceMap[b.priceRange] || 0));
    } else if (sortOrder === 'price-desc') {
      result = result.slice().sort((a, b) => (priceMap[b.priceRange] || 0) - (priceMap[a.priceRange] || 0));
    }
    return result;
  }, [detailersWithDistance, filters, sortOrder]);

  return (
    <div className="relative min-h-screen flex flex-col">
      {/* MOBILE: filter toggle and filter bar above bottom sheet */}
      <div className="block lg:hidden w-full">
        <MobileBottomSheet
          detailers={filteredDetailers}
          center={{ lat, lng }}
          highlightedId={highlightedId}
          locationLabel={location}
          isExpanded={isExpanded}
          setIsExpanded={setIsExpanded}
          filtersVisible={filtersVisible}
          setFiltersVisible={setFiltersVisible}
          filters={filters}
          setFilters={setFilters}
          allServices={allServices}
        />
      </div>

      {/* DESKTOP: 2-column layout */}
      <div className="hidden lg:grid lg:grid-cols-[1fr_40vw] lg:flex-1">
        {/* Left: scrollable cards */}
        <div className="overflow-y-auto max-h-screen px-4 pt-8 pb-8 mt-2">
          {/* Address/location and filter toggle in a row */}
          <div className="flex items-center gap-4 mb-6 mt-10">
            {location && (
              <div className="text-lg font-semibold text-gray-700">
                Showing results for: <span className="text-gray-900">{location}</span>
              </div>
            )}
            <button
              className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 transition-all flex items-center gap-2"
              onClick={() => setFiltersVisible(v => !v)}
            >
              <FunnelIcon className="h-5 w-5 text-white" />
              {filtersVisible ? 'Hide Filters' : 'Show Filters'}
            </button>
          </div>
          {/* Filter Bar */}
          {filtersVisible && (
            <FilterBar
              filters={filters}
              onFilterChange={setFilters}
              services={allServices}
              sortOrder={sortOrder}
              onSortChange={setSortOrder}
            />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {filteredDetailers.map((detailer) => (
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
          <MapContainer detailers={filteredDetailers} center={{ lat, lng }} highlightedId={highlightedId} />
        </div>
      </div>
    </div>
  )
}
