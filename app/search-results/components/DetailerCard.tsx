'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FaRegHeart, FaStar, FaCheckCircle } from 'react-icons/fa';

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
}

interface DetailerCardProps {
  detailer: Detailer;
}

export default function DetailerCard({ detailer }: DetailerCardProps) {
  return (
    <Link href={`/detailers/${detailer.id}`} className="block group">
      <div className="w-full max-w-xl min-w-[320px] rounded-2xl overflow-hidden shadow-lg bg-white mb-6 transition hover:shadow-2xl">
        {/* Image Section */}
        <div className="relative h-64 w-full">
          <Image
            src={detailer.images?.find(img => img.type === 'profile')?.url || detailer.images?.[0]?.url || '/images/detailers/default-car.jpg'}
            alt={detailer.images?.find(img => img.type === 'profile')?.alt || detailer.images?.[0]?.alt || detailer.businessName}
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
          {/* Heart Icon */}
          <button
            className="absolute top-3 right-3 bg-white rounded-full p-2 shadow hover:bg-gray-100"
            tabIndex={-1}
            type="button"
            aria-label="Save"
            onClick={e => e.preventDefault()}
          >
            <FaRegHeart className="text-gray-700 w-5 h-5" />
          </button>
        </div>
        {/* Info Section */}
        <div className="p-4">
          <div className="flex justify-between items-center mb-1">
            <span className="font-semibold text-base">{detailer.businessName}</span>
            {detailer.verified && (
              <span className="flex items-center gap-1 text-sm font-medium">
                <FaCheckCircle className="text-green-500" />
                Verified
              </span>
            )}
          </div>
          <div className="text-gray-700 text-sm mb-1">
            {detailer.description.split('.')[0] + (detailer.description.includes('.') ? '...' : '')}
          </div>
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