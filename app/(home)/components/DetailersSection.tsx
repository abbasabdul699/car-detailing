"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface DetailerImage {
  url: string;
  alt: string;
  type?: string;
}

interface Detailer {
  id: string;
  businessName: string;
  description: string;
  priceRange: string;
  images: DetailerImage[];
  detailerImages?: DetailerImage[];
  hidden: boolean;
}

export default function DetailersSection() {
  const [detailers, setDetailers] = useState<Detailer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    function fetchWithLocation(lat?: number, lng?: number) {
      let url = '/api/detailers';
      if (lat !== undefined && lng !== undefined) {
        url += `?lat=${lat}&lng=${lng}`;
      }
      fetch(url)
        .then((response) => {
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          return response.json();
        })
        .then(setDetailers)
        .catch((err) => setError(err instanceof Error ? err.message : 'Failed to fetch detailers'))
        .finally(() => setLoading(false));
      }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          fetchWithLocation(pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          // If user denies location, fetch without location (fallback)
          fetchWithLocation();
        }
      );
    } else {
      fetchWithLocation();
    }
  }, []);

  if (loading) {
    return (
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8">Nearest Mobile Detailers</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 h-48 rounded-t-lg"></div>
                <div className="bg-white p-4 rounded-b-lg">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8">Nearest Mobile Detailers</h2>
          <div className="text-red-500">{error}</div>
        </div>
      </section>
    );
  }

  // Filter out hidden detailers
  const visibleDetailers = detailers.filter(d => !d.hidden);

  return (
    <section className="py-12">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-3xl font-bold mb-8">Nearest Mobile Detailers</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {visibleDetailers.slice(0, 5).map((detailer) => {
            // Combine images and detailerImages for legacy support
            const allImages = [
              ...(detailer.images || []),
              ...(detailer.detailerImages || [])
            ];
            const profileImage = allImages.find(img => img.type === 'profile') || allImages[0];
            return (
              <Link 
                href={`/detailers/${detailer.id}`} 
                key={detailer.id}
                className="block transition-transform hover:scale-105"
              >
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="relative h-48">
                    <Image
                      src={profileImage?.url || '/images/detailers/default-car.jpg'}
                      alt={profileImage?.alt || detailer.businessName}
                      fill
                      className="rounded-t-lg object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 20vw"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="text-xl font-semibold mb-2">{detailer.businessName}</h3>
                    <p className="text-gray-600 text-sm mb-2">{detailer.description}</p>
                    <p className="text-green-600">{detailer.priceRange}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
} 