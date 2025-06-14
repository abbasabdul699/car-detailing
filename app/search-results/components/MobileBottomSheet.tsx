// components/MobileBottomSheet.tsx
'use client';

import { motion, useMotionValue, useAnimation } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import DetailerCard from '@/app/search-results/components/DetailerCard';
import MapContainer from './MapContainer';

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
}

export default function MobileBottomSheet({ detailers, center, highlightedId, locationLabel, isExpanded, setIsExpanded }: Props) {
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

        {/* Expand/Collapse Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="absolute top-2 right-4 bg-white rounded-full px-4 py-2 shadow-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          aria-label={isExpanded ? "Collapse list" : "Expand list"}
        >
          <span className="text-sm font-medium text-gray-600">
            {isExpanded ? "Collapse" : "Expand"}
          </span>
          {isExpanded ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          )}
        </button>

        {locationLabel && (
          <div className="text-center text-sm font-medium text-gray-700 mb-2">
            Showing results for: <span className="text-gray-900">{locationLabel}</span>
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
