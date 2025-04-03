'use client';

import Image from 'next/image';
import Link from 'next/link';

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
}

interface DetailerCardProps {
  detailer: Detailer;
}

export default function DetailerCard({ detailer }: DetailerCardProps) {
  if (!detailer) {
    return null;
  }

  return (
    <Link href={`/detailers/${detailer.id}`} className="block">
      <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 flex gap-4">
        <div className="relative w-32 h-32 flex-shrink-0">
          <Image
            src={detailer.images?.[0]?.url || '/images/detailers/default-car.jpg'}
            alt={detailer.images?.[0]?.alt || detailer.businessName}
            fill
            className="object-cover rounded-lg"
            sizes="128px"
          />
        </div>
        <div>
          <h3 className="font-semibold text-lg">{detailer.businessName}</h3>
          <p className="text-gray-600 text-sm mb-2">
            {detailer.address}, {detailer.city}, {detailer.state} {detailer.zipCode}
          </p>
          <p className="text-sm mb-1">{detailer.description}</p>
          <p className="text-[#389167]">{detailer.priceRange}</p>
          <p className="text-sm text-blue-600 mt-2">View Details →</p>
        </div>
      </div>
    </Link>
  );
} 