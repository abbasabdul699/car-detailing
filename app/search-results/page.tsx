"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, MarkerF } from '@react-google-maps/api';
import { GOOGLE_MAPS_CONFIG } from '@/lib/googleMaps';
import DetailerCard from './components/DetailerCard';
import Navbar from '@/app/components/Navbar';
import LoadingSpinner from '@/app/components/LoadingSpinner';

interface Detailer {
  id: string;
  businessName: string;
  description: string;
  priceRange: string;
  address: string;
  city: string;
  state: string;
  latitude: number;
  longitude: number;
  images: {
    url: string;
    alt: string;
  }[];
  services: {
    name: string;
    price: string;
    description: string;
  }[];
  distance?: number;
}

const MapComponent = ({ detailers, center }: { detailers: Detailer[], center: { lat: number, lng: number } }) => {
  const router = useRouter();
  const [selectedDetailer, setSelectedDetailer] = useState<Detailer | null>(null);

  const { isLoaded } = useJsApiLoader(GOOGLE_MAPS_CONFIG);

  if (!isLoaded) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerClassName="w-full h-[calc(100vh-80px)] sticky top-20"
      center={center}
      zoom={12}
      onClick={() => setSelectedDetailer(null)}
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
                  src={selectedDetailer.images[0]?.url || '/images/default-business.jpg'}
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
  );
};

const SearchResultsContent = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [detailers, setDetailers] = useState<Detailer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDetailer, setSelectedDetailer] = useState<Detailer | null>(null);
  const [error, setError] = useState('');

  const lat = parseFloat(searchParams.get('lat') || '0');
  const lng = parseFloat(searchParams.get('lng') || '0');
  const location = searchParams.get('location') || '';

  useEffect(() => {
    const fetchDetailers = async () => {
      try {
        console.log('Fetching detailers...');
        const response = await fetch(`/api/detailers/search?lat=${lat}&lng=${lng}`);
        if (!response.ok) throw new Error('Failed to fetch detailers');
        const data = await response.json();
        console.log('Received data:', data);

        if (Array.isArray(data)) {
          setDetailers(data);
        } else {
          console.error('Invalid data format:', data);
        }
      } catch (err) {
        setError('Failed to load detailers');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (lat && lng) {
      fetchDetailers();
    }
  }, [lat, lng]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <div className="text-red-500 p-4">{error}</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">
          Detailers near {location}
        </h1>
        <div className="space-y-4">
          {detailers.map((detailer) => (
            <DetailerCard
              key={detailer.id}
              detailer={detailer}
              isSelected={selectedDetailer?.id === detailer.id}
              onClick={() => setSelectedDetailer(detailer)}
            />
          ))}
        </div>
      </div>
      <div className="hidden lg:block">
        <MapComponent 
          detailers={detailers} 
          center={{ lat, lng }}
        />
      </div>
    </div>
  );
};

export default function SearchResults() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <SearchResultsContent />
    </Suspense>
  );
}