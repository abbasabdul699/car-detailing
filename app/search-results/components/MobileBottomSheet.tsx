// components/MobileBottomSheet.tsx
'use client';

import { motion, useMotionValue, useTransform, useAnimation } from 'framer-motion';
import { useEffect, useState } from 'react';
import DetailerCard from './DetailerCard';
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

  useEffect(() => {
    setHighlighted(highlightedId ?? null);
  }, [highlightedId]);


  return (
    <div className="block lg:hidden h-screen w-screen overflow-hidden relative">
      {/* Map in background */}
      <div className="absolute inset-0 z-0">
        <MapContainer detailers={detailers} center={center} highlightedId={highlighted} />
      </div>

      {/* Bottom sheet over map */}
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 500 }}
        onDragEnd={(_, info) => {
          if (info.point.y > 200) setIsExpanded(false);
          else setIsExpanded(true);
        }}
        animate={controls}
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-lg z-10 max-h-[90vh] overflow-y-scroll"
      >
        {/* Drag Handle */}
        <div className="w-full flex justify-center py-3">
          <div className="w-10 h-1.5 bg-gray-300 rounded-full" />
        </div>

        {locationLabel && (
          <div className="text-center text-sm font-medium text-gray-700 mb-2">
            Showing results for: <span className="text-gray-900">{locationLabel}</span>
          </div>
        )}

        <div className="px-4 pb-8 space-y-4">
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
