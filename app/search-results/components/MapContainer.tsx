'use client';

import dynamic from 'next/dynamic';

interface DetailerImage {
  url: string;
  alt: string;
}

interface Detailer {
  id: string;
  businessName: string;
  description: string;
  priceRange: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number;
  longitude: number;
  images: DetailerImage[];
}

const MapComponent = dynamic(() => import('./MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    </div>
  ),
});

interface MapContainerProps {
  detailers: Detailer[];
  center: {
    lat: number;
    lng: number;
  };
}

export default function MapContainer({ detailers, center }: MapContainerProps) {
  return (
    <div className="rounded-lg overflow-hidden shadow-lg h-[600px] sticky top-4">
      <MapComponent detailers={detailers} center={center} />
    </div>
  );
} 