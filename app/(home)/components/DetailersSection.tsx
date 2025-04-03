"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface Detailer {
  id: string;
  businessName: string;
  priceRange: string;
  description?: string;
  images?: {
    url: string;
    alt: string;
  }[];
  latitude?: number;
  longitude?: number;
}

export default function DetailersSection() {
  const [detailers, setDetailers] = useState<Detailer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchDetailers() {
      try {
        const response = await fetch('/api/detailers');
        console.log('API Response:', response.status);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch detailers');
        }
        
        const data = await response.json();
        console.log('Fetched detailers:', data);
        setDetailers(data);
      } catch (err) {
        console.error('Error fetching detailers:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchDetailers();
  }, []);

  if (loading) {
    return (
      <section className="bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8">Nearest Mobile Detailers</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm p-4 animate-pulse">
                <div className="w-full h-48 bg-gray-200 rounded-lg mb-4"></div>
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8">Nearest Mobile Detailers</h2>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-3xl font-bold mb-8">Nearest Mobile Detailers</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {detailers.map((detailer) => (
            <Link
              href={`/detailer/${detailer.id}`}
              key={detailer.id}
              className="bg-white rounded-lg shadow-sm p-4 transition hover:shadow-md"
            >
              <div className="relative w-full h-48 mb-4">
                <Image
                  src={detailer.images[0]?.url || '/images/default-avatar.png'}
                  alt={detailer.businessName}
                  fill
                  className="rounded-lg object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                />
              </div>
              <h3 className="font-semibold text-lg mb-1">{detailer.businessName}</h3>
              <p className="text-gray-600 text-sm">{detailer.description}</p>
              <p className="text-[#389167] mt-2">{detailer.priceRange}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
} 