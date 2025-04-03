"use client";

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { FaInstagram, FaTiktok, FaGlobe, FaShare } from 'react-icons/fa';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import Navbar from '@/app/components/Navbar';
import { GOOGLE_MAPS_CONFIG } from '@/lib/googleMaps';

interface Detailer {
  id: string;
  businessName: string;
  email: string;
  phone: string;
  priceRange: string;
  description: string;
  services: Array<{
    name: string;
    description: string;
    price: number;
  }>;
  images: Array<{
    url: string;
    alt: string;
  }> | [];
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number;
  longitude: number;
}

export default function DetailerProfile() {
  const params = useParams();
  const [detailer, setDetailer] = useState<Detailer | null>(null);
  const [activeTab, setActiveTab] = useState('full detailing packages');
  const [loading, setLoading] = useState(true);
  const { isLoaded } = useJsApiLoader(GOOGLE_MAPS_CONFIG);
  const [mapCenter, setMapCenter] = useState({ lat: 0, lng: 0 });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetailer = async () => {
      try {
        const response = await fetch(`/api/detailers/${params.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch detailer');
        }
        const data = await response.json();
        setDetailer({
          ...data,
          images: data.images || []
        });
        if (data.latitude && data.longitude) {
          setMapCenter({ lat: data.latitude, lng: data.longitude });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load detailer');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchDetailer();
    }
  }, [params.id]);

  useEffect(() => {
    // Track the visit when the page loads
    const trackVisit = async () => {
      try {
        await fetch(`/api/detailers/${params.id}/track-visit`, {
          method: 'POST',
        });
      } catch (error) {
        console.error('Error tracking visit:', error);
      }
    };

    trackVisit();
  }, [params.id]); // Only run when the ID changes

  const handleGetDirections = () => {
    if (detailer) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${detailer.latitude},${detailer.longitude}`;
      window.open(url, '_blank');
    }
  };

  if (loading || !isLoaded) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error || !detailer) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-500">{error || 'Detailer not found'}</div>
      </div>
    );
  }

  const mapOptions = {
    disableDefaultUI: true,
    clickableIcons: false,
    scrollwheel: false,
    zoomControl: true,
  };

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm">
          {/* Header Section */}
          <div className="p-6 border-b">
            <h1 className="text-3xl font-semibold mb-2">{detailer.businessName}</h1>
            <div className="flex items-center space-x-4 text-gray-600">
              <span>{detailer.priceRange}</span>
              <span>•</span>
              <span>{detailer.address}, {detailer.city}, {detailer.state}</span>
            </div>
          </div>

          {/* Images Section */}
          <div className="p-6 border-b">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {detailer.images.map((image, index) => (
                <div key={index} className="relative h-64 rounded-lg overflow-hidden">
                  <Image
                    src={image.url}
                    alt={image.alt}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Services Section */}
          <div className="p-6 border-b">
            <h2 className="text-2xl font-semibold mb-4">Services</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {detailer.services.map((service, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">{service.name}</h3>
                  <p className="text-gray-600 mb-2">{service.description}</p>
                  <p className="text-lg font-semibold">${service.price}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Map Section */}
          <div className="p-6">
            <h2 className="text-2xl font-semibold mb-4">Location</h2>
            <div className="h-[400px] rounded-lg overflow-hidden">
              <GoogleMap
                mapContainerClassName="w-full h-full"
                center={{
                  lat: detailer.latitude,
                  lng: detailer.longitude
                }}
                zoom={15}
              >
                <Marker
                  position={{
                    lat: detailer.latitude,
                    lng: detailer.longitude
                  }}
                  title={detailer.businessName}
                />
              </GoogleMap>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}