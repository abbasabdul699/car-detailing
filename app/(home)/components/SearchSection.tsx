"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from 'use-places-autocomplete';
import { useLoadScript } from '@react-google-maps/api';

declare global {
  interface Window {
    google: any;
  }
}

const avatars = [
  '/images/avatar1.png',
  '/images/avatar2.png',
  '/images/avatar3.png',
  '/images/avatar4.png',
  '/images/avatar5.png',
];

export default function SearchSection() {
  const router = useRouter();
  
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries: ['places']
  });

  const {
    ready,
    value,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    callbackName: "initMap",
    requestOptions: {
      componentRestrictions: { country: 'us' },
      types: ['address']
    },
    debounce: 300
  });

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);

  if (!isLoaded) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    setShowSuggestions(true);
  };

  const handleSelect = async (address: string) => {
    setValue(address, false);
    clearSuggestions();

    try {
      const results = await getGeocode({ address });
      const { lat, lng } = await getLatLng(results[0]);
      router.push(`/search-results?location=${encodeURIComponent(address)}&lat=${lat}&lng=${lng}`);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <section className="relative bg-white py-12 md:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between">
          {/* Left side - Search and Text */}
          <div className="w-full md:w-1/2">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl md:text-6xl mb-6">
              Find Car Detailers Near You
            </h1>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl">
              Professional mobile detailing services that come to you. Enter your address to discover skilled detailers in your area.
            </p>
            
            <div className="relative max-w-xl">
              <input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                disabled={!ready || !isLoaded}
                placeholder="Enter your address"
                className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#389167]"
              />
              {value && (
                <button
                  onClick={() => setValue('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}

              {status === 'OK' && (
                <ul className="absolute z-50 w-full bg-white mt-1 rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-y-auto">
                  {data.map(({ place_id, description }) => (
                    <li
                      key={place_id}
                      onClick={() => handleSelect(description)}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-gray-700"
                    >
                      {description}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Trust Indicators */}
            <div className="mt-8">
              <p className="text-sm text-gray-500 mb-2">Trusted by customers across the US</p>
              <div className="flex -space-x-2">
                {avatars.map((avatar, index) => (
                  <div
                    key={index}
                    className="relative inline-block border-2 border-white rounded-full"
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
                src="/images/porsche-911.png"
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
    </section>
  );
} 