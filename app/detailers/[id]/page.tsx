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

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error || !detailer) {
    return <div>Error: {error || 'Detailer not found'}</div>;
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
        {/* Header Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div className="md:col-span-2">
            <div className="bg-white rounded-lg overflow-hidden shadow-sm">
              <div className="relative h-[400px]">
                <Image
                  src={detailer.images[0]?.url || '/images/default-business.jpg'}
                  alt={detailer.images[0]?.alt || detailer.businessName}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h1 className="text-2xl font-bold mb-2">{detailer.businessName}</h1>
                    <p className="text-gray-600">{detailer.description}</p>
                  </div>
                  <div className="flex space-x-4">
                    <button className="p-2 hover:bg-gray-100 rounded-full">
                      <FaInstagram className="w-6 h-6" />
                    </button>
                    <button className="p-2 hover:bg-gray-100 rounded-full">
                      <FaTiktok className="w-6 h-6" />
                    </button>
                    <button className="p-2 hover:bg-gray-100 rounded-full">
                      <FaGlobe className="w-6 h-6" />
                    </button>
                    <button className="p-2 hover:bg-gray-100 rounded-full">
                      <FaShare className="w-6 h-6" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-gray-600">{detailer.priceRange}</span>
                  <span>•</span>
                  <span className="text-gray-600">{detailer.address}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Map Section */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-lg overflow-hidden shadow-sm">
              {isLoaded && mapCenter.lat !== 0 && mapCenter.lng !== 0 ? (
                <GoogleMap
                  mapContainerClassName="w-full h-[300px]"
                  center={mapCenter}
                  zoom={15}
                  options={mapOptions}
                >
                  <Marker position={mapCenter} />
                </GoogleMap>
              ) : (
                <div className="h-[300px] bg-gray-100 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
              )}
              <div className="p-4">
                <input
                  type="text"
                  value={detailer.address}
                  readOnly
                  className="w-full bg-gray-50 rounded-lg px-4 py-2 text-sm"
                />
                <button 
                  onClick={handleGetDirections}
                  className="w-full bg-[#0A2217] text-white rounded-lg px-4 py-2 mt-2 text-sm hover:bg-[#0d2d1e]"
                >
                  Get Directions
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Service Categories */}
        <div className="flex gap-6 border-b border-gray-200 mb-8 overflow-x-auto">
          {['Full detailing Packages', 'Exterior', 'Interior', 'Paint Protection', 'Additional Services'].map((tab) => (
            <button
              key={tab}
              className={`pb-4 whitespace-nowrap ${activeTab === tab.toLowerCase() ? 'border-b-2 border-black font-medium' : ''}`}
              onClick={() => setActiveTab(tab.toLowerCase())}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {detailer.services
            .filter(service => service.name.toLowerCase().includes(activeTab))
            .map((service, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="font-semibold mb-2">{service.name}</h3>
                <p className="text-gray-600 text-sm mb-4">{service.description}</p>
                <p className="font-medium">${service.price}</p>
              </div>
            ))}
        </div>
      </div>
    </>
  );
}