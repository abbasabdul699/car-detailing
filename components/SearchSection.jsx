import Image from 'next/image';

const SearchSection = () => {
  const avatars = [
    '/avatar1.png',
    '/avatar2.png',
    '/avatar3.png',
    '/avatar4.png',
    '/avatar5.png',
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 pt-20">
      <div className="flex flex-col md:flex-row items-center justify-between">
        {/* Left side - Text and Search */}
        <div className="w-full md:w-1/2 md:pr-8">
          <h1 className="text-5xl font-serif mb-4">
            Find Top-Rated Detailers
          </h1>
          <p className="text-gray-600 mb-8">
            Carefully selected to ensure quality service and fair pricing you can count on
          </p>
          
          <div className="relative max-w-xl">
            <div className="flex items-center border rounded-lg shadow-sm">
              <div className="pl-4">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search city, zip, or address"
                className="w-full py-3 px-4 outline-none rounded-lg"
              />
              <button className="bg-[rgba(10,34,23,1)] text-white px-6 py-3 rounded-lg m-1 hover:bg-[rgba(10,34,23,0.9)] transition-colors">
                Search
              </button>
            </div>
          </div>

          <div className="mt-8">
            <p className="text-gray-500 text-sm mb-2">
              Connecting happy customers with the best detailers at the best price
            </p>
            <div className="flex -space-x-2">
              {avatars.map((avatar, index) => (
                <div 
                  key={index} 
                  className="w-8 h-8 rounded-full border-2 border-white relative hover:z-10 transition-transform hover:scale-110"
                >
                  <Image
                    src={avatar}
                    alt={`Customer ${index + 1}`}
                    width={32}
                    height={32}
                    className="rounded-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right side - Car Image */}
        <div className="w-full md:w-1/2 mt-8 md:mt-0 relative">
          <div className="relative">
            <Image
              src="/porsche-911.png"
              alt="Porsche 911 being detailed"
              width={800}
              height={500}
              priority
              className="w-full h-auto object-contain"
            />

          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchSection; 