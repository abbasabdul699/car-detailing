'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface DetailerCardProps {
  detailer: {
    id: string;
    businessName: string;
    location: {
      lat: number;
      lng: number;
    };
    images: {
      url: string;
      alt: string;
    }[];
    distance: number;
    priceRange: string;
    description?: string;
    services?: {
      name: string;
      price: number;
    }[];
  };
  isSelected: boolean;
  onClick: () => void;
}

export default function DetailerCard({ detailer, isSelected, onClick }: DetailerCardProps) {
  const router = useRouter();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onClick();
  };

  const handleViewProfile = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/detailers/${detailer.id}`);
  };

  return (
    <div 
      onClick={handleClick}
      className={`
        w-full bg-white rounded-xl shadow-sm transition-all duration-200 hover:shadow-md
        ${isSelected ? 'ring-2 ring-[#389167] bg-[#F0F7F0]' : 'hover:bg-gray-50'}
      `}
    >
      <div className="flex p-4 gap-4">
        {/* Image Section */}
        <div className="relative w-32 h-32 rounded-lg overflow-hidden flex-shrink-0">
          <Image
            src={detailer.images[0]?.url || '/images/default-business.jpg'}
            alt={detailer.images[0]?.alt || detailer.businessName}
            fill
            className="object-cover"
          />
        </div>
        
        {/* Content Section */}
        <div className="flex-grow min-w-0">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {detailer.businessName}
            </h3>
            <span className="text-[#389167] font-medium text-sm">
              {detailer.priceRange}
            </span>
          </div>
          
          {/* Services Preview */}
          {detailer.services && detailer.services.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {detailer.services.slice(0, 2).map((service) => (
                <span 
                  key={service.name}
                  className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600"
                >
                  {service.name} - ${service.price}
                </span>
              ))}
              {detailer.services.length > 2 && (
                <span className="text-xs text-gray-500">
                  +{detailer.services.length - 2} more services
                </span>
              )}
            </div>
          )}

          {/* Description Preview */}
          {detailer.description && (
            <p className="text-sm text-gray-600 line-clamp-2 mb-3">
              {detailer.description}
            </p>
          )}

          {/* Action Button */}
          <button
            onClick={handleViewProfile}
            className="text-[#389167] hover:text-[#1D503A] text-sm font-medium flex items-center gap-1 transition-colors"
          >
            View Profile
            <svg 
              className="w-4 h-4" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
} 