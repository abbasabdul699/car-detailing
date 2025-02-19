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
  return (
    <a href={`/detailers/${id}`} className="block rounded-3xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
      <div className="relative">
        <img 
          src={images[0]?.url || '/images/default-business.jpg'} 
          alt={images[0]?.alt || businessName}
          className="w-full h-64 object-cover"
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
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-lg">{businessName}</h3>
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