'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleMap, Marker, InfoWindow } from '@react-google-maps/api';
import DetailerCard from './DetailerCard';
import { useMapLoader } from '@/app/components/MapLoaderProvider';

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

interface MapComponentProps {
  detailers: Detailer[];
  center: {
    lat: number;
    lng: number;
  };
  highlightedId?: string | null;
}

const MapComponent = ({ detailers, center, highlightedId }: MapComponentProps) => {
  console.log('MapComponent center prop:', center);
  const router = useRouter();
  const [selectedDetailer, setSelectedDetailer] = useState<Detailer | null>(null);
  const { isLoaded } = useMapLoader();

  if (!isLoaded) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="fixed top-0 right-0 w-[40vw] h-full z-50">
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={center}
        zoom={10}
        onClick={() => setSelectedDetailer(null)}
        options={{
          disableDefaultUI: false,
          zoomControl: true,
          draggable: true,
          scrollwheel: true,
          gestureHandling: 'auto',
        }}
      >
        {detailers.map((detailer) => (
          <Marker
            key={detailer.id}
            position={{
              lat: detailer.latitude,
              lng: detailer.longitude
            }}
            title={detailer.businessName}
            onClick={() => setSelectedDetailer(detailer)}
            icon={
              highlightedId === detailer.id
                ? {
                    url: '/images/marker.svg',
                    scaledSize: new window.google.maps.Size(40, 40),
                  }
                : {
                    url: '/images/marker.svg',
                    scaledSize: new window.google.maps.Size(40, 40),
                  }
            }
          />
        ))}
        
        {selectedDetailer && (
          <InfoWindow
            position={{
              lat: selectedDetailer.latitude,
              lng: selectedDetailer.longitude
            }}
            onCloseClick={() => setSelectedDetailer(null)}
          >
            <div className="max-w-sm">
              <div className="flex items-start gap-3">
                <div className="relative w-20 h-20 flex-shrink-0">
                  <img
                    src={selectedDetailer.images[0]?.url || '/images/detailers/default-car.jpg'}
                    alt={selectedDetailer.images[0]?.alt || selectedDetailer.businessName}
                    className="w-full h-full object-cover rounded"
                  />
                </div>
                <div>
                  <h3 className="font-semibold text-sm mb-1">
                    {selectedDetailer.businessName}
                  </h3>
                  <p className="text-gray-600 text-xs mb-1">
                    {selectedDetailer.priceRange}
                  </p>
                  <p className="text-gray-600 text-xs mb-2">
                    {selectedDetailer.address}
                  </p>
                  <button
                    onClick={() => router.push(`/detailers/${selectedDetailer.id}`)}
                    className="text-[#389167] hover:text-[#1D503A] text-xs font-medium"
                  >
                    View Details →
                  </button>
                </div>
              </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* Card grid: full width, but with right margin so cards don't go under the map */}
      <div className="relative z-20 px-4 pt-8 pb-8 lg:pr-[42vw] lg:max-w-[60vw] mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {detailers.map((detailer) => (
            <div
              key={detailer.id}
            >
              <DetailerCard detailer={detailer} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MapComponent; 