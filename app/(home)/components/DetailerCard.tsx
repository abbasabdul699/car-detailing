import Image from 'next/image'
import { useRouter } from 'next/navigation'

interface DetailerCardProps {
  id: number;
  businessName: string;
  googleRating: number;
  priceRange: string;
  images: { url: string; alt: string }[];
  distance: number;
  services: { name: string; price: number }[];
  totalReviews: number;
}

const DetailerCard = ({
  id,
  businessName,
  googleRating,
  priceRange,
  images,
  distance,
  services,
  totalReviews
}: DetailerCardProps) => {
  const router = useRouter();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    router.push(`/detailers/${id}`);
  };

  return (
    <a 
      href={`/detailers/${id}`} 
      onClick={handleClick}
      className="block rounded-3xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow h-[400px] flex flex-col"
    >
      <div className="relative h-[250px]">
        <Image 
          src={images[0]?.url || '/images/default-business.jpg'} 
          alt={images[0]?.alt || businessName}
          fill
          className="object-cover"
          onError={(e) => {
            e.currentTarget.src = '/images/default-business.jpg'
          }}
        />
        <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-2 py-1 rounded-full text-sm">
          ⭐ {googleRating} ({totalReviews})
        </div>
        <div className="absolute top-4 right-4 bg-black bg-opacity-50 text-white px-2 py-1 rounded-full text-sm">
          {priceRange}
        </div>
      </div>
      <div className="p-4 flex-grow bg-white">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-lg line-clamp-1">{businessName}</h3>
          <span className="text-gray-500 text-sm">{distance.toFixed(1)} miles</span>
        </div>
        <div className="text-sm text-gray-600">
          Starting at ${Math.min(...services.map(s => s.price))}
        </div>
      </div>
    </a>
  );
};

export default DetailerCard; 