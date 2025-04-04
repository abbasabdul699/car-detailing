"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
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

interface Suggestion {
  place_id: string;
  description: string;
}

export default function SearchSection() {
  const router = useRouter();
  const [address, setAddress] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: ['places']
  });

  const handleAddressChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAddress(value);

    if (value.length > 2 && isLoaded) {
      try {
        const service = new window.google.maps.places.AutocompleteService();
        const response = await service.getPlacePredictions({
          input: value,
          componentRestrictions: { country: 'us' },
          types: ['address']
        });
        setSuggestions(response?.predictions || []);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      }
    } else {
      setSuggestions([]);
    }
  };

  const handleSearch = async () => {
    if (!address) return;
    
    try {
      const geocoder = new window.google.maps.Geocoder();
      const response = await geocoder.geocode({ address });
      if (response.results?.[0]) {
        const { lat, lng } = response.results[0].geometry.location;
        router.push(`/search-results?location=${encodeURIComponent(address)}&lat=${lat()}&lng=${lng()}`);
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  return (
    <div className="flex flex-col items-center py-16 px-4">
      {/* Main Heading */}
      <h1 className="text-5xl md:text-6xl font-serif text-center mb-4">
        Find top-rated mobile car detailers
      </h1>
      
      {/* Subheading */}
      <p className="text-gray-600 text-center mb-8">
        Carefully selected to ensure quality service and fair pricing you can count on
      </p>

      {/* Search Bar */}
      <div className="w-full max-w-2xl relative">
        <div className="flex items-center bg-white rounded-full border shadow-sm">
          <div className="pl-4">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={address}
            onChange={handleAddressChange}
            placeholder="Search city, zip, or address"
            className="w-full py-3 px-4 outline-none rounded-full text-gray-700"
          />
          <button
            onClick={handleSearch}
            className="bg-[#0A2217] text-white px-8 py-3 rounded-full hover:bg-[#0A2217]/90 transition-colors mr-1"
          >
            Search
          </button>
        </div>

        {/* Suggestions Dropdown */}
        {suggestions.length > 0 && (
          <ul className="absolute z-50 w-full bg-white mt-2 rounded-lg shadow-lg border border-gray-200">
            {suggestions.map((suggestion) => (
              <li
                key={suggestion.place_id}
                onClick={() => {
                  setAddress(suggestion.description);
                  setSuggestions([]);
                  handleSearch();
                }}
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
              >
                {suggestion.description}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Trust Indicators */}
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500 mb-2">
          Connecting happy customers with the best detailers at the best price
        </p>
        <div className="flex justify-center -space-x-2">
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
  );
} 