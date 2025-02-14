const DetailerCard = ({ image, rating, price, name, type, distance }) => {
  return (
    <div className="rounded-3xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
      <div className="relative">
        <img src={image} alt={name} className="w-full h-64 object-cover" />
        <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-2 py-1 rounded-full text-sm">
          ⭐ {rating}
        </div>
        <div className="absolute top-4 right-4 bg-black bg-opacity-50 text-white px-2 py-1 rounded-full text-sm">
          ${price}
        </div>
      </div>
      <div className="p-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-gray-200"></div>
        <div>
          <h3 className="font-semibold">{name}</h3>
          <p className="text-gray-500 text-sm">{type}</p>
        </div>
        <div className="ml-auto text-gray-500 text-sm">
          {distance} miles
        </div>
      </div>
    </div>
  );
};

export default DetailerCard; 