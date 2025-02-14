import DetailerCard from './DetailerCard';

const DetailersSection = () => {
  const detailers = [
    {
      id: 1,
      image: "/path-to-image-1.jpg",
      rating: "5-$$",
      price: "50 (59)",
      name: "73 Automotive",
      type: "Mobile Detailer",
      distance: "5.1"
    },

    {
        id: 2,
        image: "/path-to-image-1.jpg",
        rating: "5-$$",
        price: "50 (59)",
        name: "73 Automotive",
        type: "Mobile Detailer",
        distance: "5.1"
      },      

      {
        id: 3,
        image: "/path-to-image-1.jpg",
        rating: "5-$$",
        price: "50 (59)",
        name: "73 Automotive",
        type: "Mobile Detailer",
        distance: "5.1"
      },    

      {
        id: 4,
        image: "/path-to-image-1.jpg",
        rating: "5-$$",
        price: "50 (59)",
        name: "73 Automotive",
        type: "Mobile Detailer",
        distance: "5.1"
      },
    // Add more detailers...
  ];

  return (
    <div className="bg-gray-100 py-16 w-full">
      <div className="px-6">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-semibold">Nearest detailers</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {detailers.map((detailer) => (
            <DetailerCard key={detailer.id} {...detailer} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default DetailersSection; 