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
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

export default function DetailersSection() {
  const [detailers, setDetailers] = useState<Detailer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchDetailers() {
      try {
        console.log('Fetching detailers...');
        const response = await fetch('/api/detailers');
        console.log('Response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Fetched data:', data);
        setDetailers(data);
      } catch (err) {
        console.error('Fetch error:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch detailers');
      } finally {
        setLoading(false);
      }
    }

    fetchDetailers();
  }, []);

  if (loading) {
    return (
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8">Nearest Mobile Detailers</h2>
          <div className="animate-pulse bg-gray-200 rounded-lg h-96"></div>
        </div>
      </section>
    );
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <section className="py-12">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-3xl font-bold mb-8">Nearest Mobile Detailers</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {detailers.map((detailer) => (
            <Link 
              href={`/detailers/${detailer.id}`} 
              key={detailer.id}
              className="block transition-transform hover:scale-105"
            >
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="relative h-48">
                  <Image
                    src={detailer.images?.[0]?.url || '/images/detailers/default-car.jpg'}
                    alt={detailer.images?.[0]?.alt || detailer.businessName}
                    fill
                    className="rounded-t-lg object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                  />
                </div>
                <div className="p-4">
                  <h3 className="text-xl font-semibold mb-2">{detailer.businessName}</h3>
                  <p className="text-gray-600 text-sm mb-2">{detailer.description}</p>
                  <p className="text-green-600">{detailer.priceRange}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
} 