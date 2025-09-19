"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface DetailerImage {
  url: string;
  alt: string;
}

interface Detailer {
  id: string;
  businessName: string;
  description: string;
  priceRange: string;
  images: DetailerImage[];
}

const fastTransition = "transition-all duration-150 ease-out";

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
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl font-bold mb-12 text-center bg-gradient-to-r from-gray-900 to-blue-900 bg-clip-text text-transparent">
            Nearest <span className="text-[#0A2217]">Mobile Detailers</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gradient-to-br from-gray-200 to-gray-300 h-56 rounded-3xl"></div>
                <div className="glass-effect p-6 rounded-3xl -mt-4 fluid-shadow">
                  <div className="h-5 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full w-3/4 mb-3"></div>
                  <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-full w-1/2"></div>
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
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl font-bold mb-12 text-center bg-gradient-to-r from-gray-900 to-blue-900 bg-clip-text text-transparent">
            Nearest <span className="text-[#0A2217]">Mobile Detailers</span>
          </h2>
          <div className="text-red-500 glass-effect rounded-3xl p-6 text-center border border-red-200 smooth-transition">
            {error}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-4xl font-bold mb-12 text-center">
          Nearest <span className="text-green-700">Mobile Detailers</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 items-start">
          {detailers.slice(0, 5).map((detailer) => {
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
                className={`block ${fastTransition} hover:scale-105 hover:-translate-y-2 group`}
              >
                <div className="glass-effect organic-border fluid-shadow hover:fluid-shadow-hover smooth-transition overflow-hidden">
                  <div className="relative h-56">
                    <Image
                      src={profileImage?.url || '/images/detailers/default-car.jpg'}
                      alt={profileImage?.alt || detailer.businessName}
                      fill
                      className={`rounded-t-3xl object-cover group-hover:scale-110 ${fastTransition}`}
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 20vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent rounded-t-3xl"></div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-semibold mb-3 text-gray-900 group-hover:text-blue-600 smooth-transition">
                      {detailer.businessName}
                    </h3>
                    <p className="text-gray-600 text-sm mb-3 leading-relaxed">{detailer.description}</p>
                    <p className="text-green-600 font-medium">{detailer.priceRange}</p>
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