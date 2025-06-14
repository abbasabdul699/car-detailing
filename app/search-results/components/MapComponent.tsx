'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleMap, Marker, InfoWindow } from '@react-google-maps/api';
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
    <div className="w-full h-full">
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
            position={{ lat: detailer.latitude, lng: detailer.longitude }}
            title={detailer.businessName}
            onClick={() => setSelectedDetailer(detailer)}
            icon={{
              url: '/images/marker.svg',
              scaledSize:
                typeof window !== "undefined" &&
                window.google &&
                window.google.maps
                  ? new window.google.maps.Size(40, 40)
                  : undefined,
            }}
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
    </div>
  );
};

export default MapComponent;
