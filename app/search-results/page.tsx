"use client";

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { GOOGLE_MAPS_CONFIG } from '@/lib/googleMaps';
import DetailerCard from './components/DetailerCard';
import Navbar from '@/app/components/Navbar';

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

export default function SearchResults() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [detailers, setDetailers] = useState<Detailer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDetailer, setSelectedDetailer] = useState<Detailer | null>(null);

  const { isLoaded } = useJsApiLoader(GOOGLE_MAPS_CONFIG);

  const center = {
    lat: parseFloat(searchParams.get('lat') || '0'),
    lng: parseFloat(searchParams.get('lng') || '0')
  };

  useEffect(() => {
    const fetchDetailers = async () => {
      try {
        console.log('Fetching detailers...');
        const response = await fetch('/api/detailers');
        const data = await response.json();
        console.log('Received data:', data);

        if (Array.isArray(data)) {
          setDetailers(data);
        } else {
          console.error('Invalid data format:', data);
        }
      } catch (error) {
        console.error('Error fetching detailers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetailers();
  }, []);

  if (!isLoaded || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
        {/* Left side - Detailer List */}
        <div className="p-6 overflow-y-auto max-h-[calc(100vh-64px)]">
          <h2 className="text-2xl font-semibold mb-6">
            {detailers.length} detailers near {searchParams.get('location')}
          </h2>
          
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

        {/* Right side - Map */}
        <div className="h-[calc(100vh-64px)] sticky top-16">
          <GoogleMap
            mapContainerClassName="w-full h-full"
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
        </div>
      </div>
    </div>
  );
}