'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';

interface CarBrand {
  name: string;
  logo: string;
}

export default function BrandStep() {
  const params = useParams();
  const detailerId = params.detailerId as string;
  const [brands, setBrands] = useState<CarBrand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [showCustomBrand, setShowCustomBrand] = useState(false);
  const [customBrand, setCustomBrand] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const service = searchParams.get('service');

  useEffect(() => {
    fetch('/api/brands')
      .then(res => res.json())
      .then(data => setBrands(data));
  }, []);

  const handleContinue = () => {
    if (selectedBrand) {
      router.push(`/book/${detailerId}/model-year?brand=${encodeURIComponent(selectedBrand)}&service=${encodeURIComponent(service ?? '')}`);
    }
  };

  const handleBack = () => {
    router.push(`/book/${detailerId}/service`);
  };

  const handleOtherClick = () => {
    setShowCustomBrand(true);
    setSelectedBrand(null);
  };

  const handleCustomBrandConfirm = () => {
    if (customBrand.trim()) {
      setSelectedBrand(customBrand.trim());
      setShowCustomBrand(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center bg-white">
      <div className="w-full h-full flex flex-col justify-center items-center max-w-2xl md:max-w-3xl mx-auto p-12">
        <button onClick={handleBack} className="mb-8 text-gray-500 hover:text-black text-lg">&larr; Back</button>
        <h1 className="text-4xl font-bold mb-8 text-black">Book a Service</h1>
        <h2 className="text-2xl font-semibold mb-8 text-black">What is your car brand?</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-8 mb-12 max-h-[60vh] overflow-y-auto">
          {brands.map((brand) => (
            <button
              key={brand.name}
              className={`relative border-2 rounded-xl p-4 sm:p-8 flex flex-col items-center justify-center transition-all focus:outline-none bg-white
                ${selectedBrand === brand.name
                  ? 'border-green-700 shadow-lg'
                  : 'border-green-200 hover:border-green-400'}
              `}
              onClick={() => {
                setSelectedBrand(brand.name);
                setShowCustomBrand(false);
              }}
              type="button"
            >
              {/* Checkmark for selected brand */}
              {selectedBrand === brand.name && (
                <span className="absolute top-2 right-2 text-green-700 text-2xl font-bold">✓</span>
              )}
              <img src={brand.logo} alt={brand.name} className="w-30 h-30 sm:w-40 sm:h-40 object-contain mb-2 sm:mb-4" />
              <span className="text-lg sm:text-xl font-bold text-black">{brand.name}</span>
            </button>
          ))}
          {/* "Other" button */}
          <button
            className={`relative border-2 rounded-xl p-4 sm:p-8 flex flex-col items-center justify-center transition-all focus:outline-none bg-white
              ${showCustomBrand || (selectedBrand && !brands.some(b => b.name === selectedBrand))
                ? 'border-green-700 shadow-lg'
                : 'border-green-200 hover:border-green-400'}
            `}
            onClick={handleOtherClick}
            type="button"
          >
            {/* Checkmark for custom brand */}
            {(showCustomBrand || (selectedBrand && !brands.some(b => b.name === selectedBrand))) && (
              <span className="absolute top-2 right-2 text-green-700 text-2xl font-bold">✓</span>
            )}
            <span className="text-3xl sm:text-4xl mb-2 sm:mb-4">+</span>
            <span className="text-lg sm:text-xl font-bold text-black">Other</span>
          </button>
        </div>
        {/* Custom brand input modal/inline form */}
        {showCustomBrand && (
          <div className="mb-8 flex flex-col items-center">
            <input
              type="text"
              placeholder="Enter your car brand"
              value={customBrand}
              onChange={e => setCustomBrand(e.target.value)}
              className="border rounded px-4 py-2 mb-2"
            />
            <button
              className="px-4 py-2 bg-green-600 text-white rounded"
              onClick={handleCustomBrandConfirm}
            >
              Confirm
            </button>
          </div>
        )}
        <button
          className="w-full py-3 rounded-full bg-black text-white font-semibold disabled:bg-gray-300 disabled:text-gray-500 transition"
          disabled={!selectedBrand}
          onClick={handleContinue}
        >
          Continue
        </button>
      </div>
    </div>
  );
} 