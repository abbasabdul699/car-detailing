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
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDetailers = async () => {
      try {
        const response = await fetch('/api/detailers');
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || `HTTP error! status: ${response.status}`);
        }
        
        if (!data || data.length === 0) {
          setError('No detailers found in the database');
          return;
        }
        
        setDetailers(data);
        setError('');
      } catch (err) {
        console.error('Error details:', err);
        setError(`Failed to fetch detailers: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchDetailers();
  }, []);

  if (loading) {
    return (
      <section className="bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8">Nearest Mobile Detailers</h2>
          <div className="animate-pulse">Loading detailers...</div>
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
            <p className="text-sm text-red-500 mt-2">Please try again later or contact support if the issue persists.</p>
          </div>
        </div>
      </section>
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