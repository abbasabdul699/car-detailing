"use client";

import { useState, useEffect } from 'react';
import DetailerCard from './DetailerCard';

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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetailers = async () => {
      try {
        const response = await fetch('/api/detailers');
        if (!response.ok) {
          throw new Error('Failed to fetch detailers');
        }
        const data = await response.json();
        // Ensure data is an array
        setDetailers(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching detailers:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch detailers');
      } finally {
        setLoading(false);
      }
    };

    fetchDetailers();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-100 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-semibold mb-8">Nearest Mobile Detailers</h2>
          <p className="text-red-600">Error: {error}</p>
        </div>
      </div>
    );
  }

  if (!detailers.length) {
    return (
      <div className="bg-gray-100 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-semibold mb-8">Nearest Mobile Detailers</h2>
          <p className="text-gray-600">No detailers found in your area.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-semibold mb-8">Nearest Mobile Detailers</h2>
        <div className="flex overflow-x-auto gap-6 pb-4 hide-scrollbar">
          {detailers.map((detailer) => (
            <div key={detailer.id} className="flex-none w-[300px]">
              <DetailerCard {...detailer} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 