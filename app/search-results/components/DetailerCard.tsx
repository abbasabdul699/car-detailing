'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface DetailerCardProps {
  detailer: {
    id: string;
    businessName: string;
    description: string;
    priceRange: string;
    address: string;
    city: string;
    state: string;
    images: {
      url: string;
      alt: string;
    }[];
    services: {
      name: string;
      price: string;
      description: string;
    }[];
    distance?: number;
  };
  isSelected?: boolean;
  onClick?: () => void;
}

export default function DetailerCard({ detailer, isSelected, onClick }: DetailerCardProps) {
  const router = useRouter();

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the card's onClick
    router.push(`/detailers/${detailer.id}`);
  };

  return (
    <div 
      className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer
        ${isSelected ? 'ring-2 ring-[#389167]' : ''}`}
      onClick={onClick}
    >
      <div className="p-4">
        <div className="flex gap-4">
          <div className="relative w-32 h-32 flex-shrink-0">
            <Image
              src={detailer.images[0]?.url || '/images/default-business.jpg'}
              alt={detailer.images[0]?.alt || detailer.businessName}
              fill
              className="object-cover rounded-lg"
            />
          </div>
          
          <div className="flex-1">
            <h3 className="text-xl font-semibold mb-2">{detailer.businessName}</h3>
            <p className="text-gray-600 mb-2">{detailer.priceRange}</p>
            <p className="text-gray-600 text-sm mb-2">
              {detailer.address}, {detailer.city}, {detailer.state}
            </p>
            {detailer.description && (
              <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                {detailer.description}
              </p>
            )}
            <button 
              onClick={handleViewDetails}
              className="text-[#389167] hover:text-[#1D503A] text-sm font-medium"
            >
              View Details →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 