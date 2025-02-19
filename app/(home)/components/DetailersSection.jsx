"use client";
import { useState, useEffect } from 'react';
import DetailerCard from './DetailerCard';
import { calculateDistance } from '@/lib/utils';

const DetailersSection = () => {
  const [userLocation, setUserLocation] = useState(null);
  const [detailers, setDetailers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          
          try {
            const response = await fetch(
              `/api/detailers?lat=${latitude}&lng=${longitude}&radius=50`
            );
            const data = await response.json();
            setDetailers(data);
          } catch (error) {
            console.error('Error fetching detailers:', error);
          } finally {
            setLoading(false);
          }
        },
        (error) => {
          console.error("Error getting location:", error);
          setLoading(false);
        }
      );
    }
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center py-16">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    </div>;
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
};

export default DetailersSection; 