// components/MobileBottomSheet.tsx
'use client';

import { motion, useMotionValue, useAnimation } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import DetailerCard from '@/app/search-results/components/DetailerCard';
import MapContainer from './MapContainer';
import FilterBar, { FilterOptions } from './FilterBar';
import { FunnelIcon } from '@heroicons/react/24/outline';

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

interface Props {
  detailers: Detailer[];
  center: { lat: number; lng: number };
  highlightedId?: string | null;
  locationLabel?: string;
  isExpanded: boolean;
  setIsExpanded: (val: boolean) => void;
  filtersVisible: boolean;
  setFiltersVisible: (val: boolean) => void;
  filters: FilterOptions;
  setFilters: (val: FilterOptions) => void;
  allServices: string[];
}

export default function MobileBottomSheet({ detailers, center, highlightedId, locationLabel, isExpanded, setIsExpanded, filtersVisible, setFiltersVisible, filters, setFilters, allServices }: Props) {
  const y = useMotionValue(0);
  const controls = useAnimation();
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHighlighted(highlightedId ?? null);
  }, [highlightedId]);

  useEffect(() => {
    controls.start({ y: isExpanded ? 0 : 400 });
  }, [isExpanded]);

  const handleDragStart = () => {
    if (scrollRef.current) {
      scrollRef.current.style.overflowY = 'hidden';
    }
  };

  const handleDragEnd = (_: any, info: any) => {
    if (scrollRef.current) {
      scrollRef.current.style.overflowY = 'auto';
    }
    if (info.offset.y > 100 && info.velocity.y > 20) setIsExpanded(false);
    else if (info.offset.y < -100 || info.velocity.y < -20) setIsExpanded(true);
  };

  return (
    <div className="block lg:hidden h-screen w-screen overflow-hidden relative">
      {/* Map in background */}
      <div className="absolute inset-0 z-0">
        <MapContainer detailers={detailers} center={center} highlightedId={highlighted} />
      </div>

      {/* Bottom sheet over map */}
      <motion.div
        drag="y"
        dragElastic={0.15}
        dragConstraints={{ top: 0, bottom: 500 }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        animate={controls}
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-lg z-10 max-h-[90vh]"
      >
        {/* Drag Handle */}
        <div className="w-full flex justify-center py-3 cursor-grab active:cursor-grabbing">
          <div className="w-10 h-1.5 bg-gray-300 rounded-full" />
        </div>

        {locationLabel && (
          <div className="text-center text-sm font-medium text-gray-700 mb-2">
            Showing results for: <span className="text-gray-900">{locationLabel}</span>
          </div>
        )}

        {/* Filter toggle button and bar */}
        <div className="flex items-center gap-4 mb-4 justify-center">
          <button
            className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 transition-all flex items-center gap-2"
            onClick={() => setFiltersVisible(!filtersVisible)}
          >
            <FunnelIcon className="h-5 w-5 text-white" />
            {filtersVisible ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>
        {filtersVisible && (
          <div className="mb-4">
            <FilterBar
              onFilterChange={setFilters}
              services={allServices}
            />
          </div>
        )}

        <div
          ref={scrollRef}
          className="px-4 pb-8 space-y-4 overflow-y-auto max-h-[75vh]"
        >
          {detailers.map((detailer) => (
            <div
              key={detailer.id}
              onMouseEnter={() => setHighlighted(detailer.id)}
              onMouseLeave={() => setHighlighted(null)}
            >
              <DetailerCard detailer={detailer} />
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
