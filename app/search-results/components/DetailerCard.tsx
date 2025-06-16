'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FaRegHeart, FaStar, FaCheckCircle } from 'react-icons/fa';
import { useEffect, useState } from 'react';
import { StarIcon } from '@heroicons/react/24/solid';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

interface DetailerImage {
  url: string;
  alt: string;
}

interface Detailer {
  id: string;
  businessName: string;
  description: string;
  priceRange: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  images: DetailerImage[];
  rating?: number;
  reviewCount?: number;
  badge?: string; // e.g. "Superhost" or "Guest favorite"
  price?: string; // e.g. "$752"
  verified?: boolean;
  googlePlaceId?: string;
}

interface DetailerCardProps {
  detailer: Detailer;
}

export default function DetailerCard({ detailer }: DetailerCardProps) {
  const [googleRating, setGoogleRating] = useState<number | null>(null);

  useEffect(() => {
    if (detailer.googlePlaceId) {
      fetch(`/api/google-reviews?placeId=${detailer.googlePlaceId}`)
        .then(res => res.json())
        .then(data => {
          if (data.rating) setGoogleRating(data.rating);
        });
    }
  }, [detailer.googlePlaceId]);

  return (
    <Link href={`/detailers/${detailer.id}`} className="block group">
      <div className="w-full max-w-xl min-w-[320px] rounded-2xl overflow-hidden shadow-lg bg-white mb-6 transition hover:shadow-2xl">
        {/* Image Section */}
        <div className="relative h-64 w-full">
          <Image
            src={detailer.images?.[0]?.url || '/images/detailers/default-car.jpg'}
            alt={detailer.images?.[0]?.alt || detailer.businessName}
            fill
            className="object-cover"
            sizes="400px"
            priority
          />
          {/* Badge */}
          {detailer.badge && (
            <span className="absolute top-3 left-3 bg-white text-xs font-semibold px-3 py-1 rounded-full shadow">
              {detailer.badge}
            </span>
          )}
          {/* Verified Tag */}
          {detailer.verified && (
            <div className="absolute top-2 right-2 bg-white rounded-full px-3 py-1 flex items-center shadow">
              <CheckCircleIcon className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-xs font-semibold text-green-700">Verified</span>
            </div>
          )}
        </div>
        {/* Info Section */}
        <div className="p-4">
          <div className="flex justify-between items-center mb-1">
            <span className="font-semibold text-base">{detailer.businessName}</span>
            {detailer.verified && (
              <div className="flex items-center gap-1 text-base font-semibold mt-1">
                <StarIcon className="h-5 w-5 text-yellow-400" />
                <span>{googleRating ? googleRating.toFixed(1) : '—'}</span>
              </div>
            )}
          </div>
          <div className="text-gray-700 text-sm mb-1">{detailer.description}</div>
          <div className="text-gray-500 text-xs mb-1">{detailer.city}</div>
          <div className="text-base">
            <span className="font-semibold">{detailer.price || detailer.priceRange}</span>
            <span className="text-gray-500 text-sm"> For detail</span>
          </div>
        </div>
      </div>
    </Link>
  );
} 