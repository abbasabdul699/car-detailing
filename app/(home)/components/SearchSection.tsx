"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useLoadScript } from '@react-google-maps/api';

declare global {
  interface Window {
    google: typeof google;
  }
}

const libraries: ["places"] = ["places"];

const avatars = [
  '/images/avatar1.png',
  '/images/avatar2.png',
  '/images/avatar3.png',
  '/images/avatar4.png',
  '/images/avatar5.png',
];

export default function SearchSection() {
  const router = useRouter();
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  useEffect(() => {
    if (!isLoaded || !window.google || !inputRef.current) return;

    const options = {
      componentRestrictions: { country: "us" },
      fields: ["address_components", "geometry", "formatted_address"],
      strictBounds: false,
    };

    const autocomplete = new window.google.maps.places.Autocomplete(
      inputRef.current,
      options
    );

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      
      if (!place.geometry?.location) {
        setError('Please select a valid address from the suggestions');
        return;
      }

      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      const formattedAddress = place.formatted_address;

      window.location.href = `/search-results?location=${encodeURIComponent(formattedAddress || '')}&lat=${lat}&lng=${lng}`;
    });

    autocompleteRef.current = autocomplete;

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [isLoaded]);

  const handleSearch = async () => {
    try {
      setError('');
      
      console.log('Search button clicked!');
      const currentInput = inputRef.current?.value || '';
      console.log('Current input value:', currentInput);

      if (!currentInput.trim()) {
        setError('Please enter an address');
        return;
      }

      if (!isLoaded || !window.google) {
        setError('Google Maps is not loaded yet. Please try again in a moment.');
        return;
      }

      const geocoder = new window.google.maps.Geocoder();
      console.log('Attempting to geocode address:', currentInput);
      
      const result = await new Promise<google.maps.GeocoderResult>((resolve, reject) => {
        geocoder.geocode({ address: currentInput }, (results, status) => {
          console.log('Geocoding results:', results);
          console.log('Geocoding status:', status);
          if (status === window.google.maps.GeocoderStatus.OK && results && results[0]) {
            resolve(results[0]);
          } else {
            reject(new Error('Could not find this address. Please try a different address.'));
          }
        });
      });

      if (!result.geometry?.location) {
        throw new Error('No location found in geocoding result');
      }

      const lat = result.geometry.location.lat();
      const lng = result.geometry.location.lng();
      const formattedAddress = result.formatted_address || currentInput;

      window.location.href = `/search-results?location=${encodeURIComponent(formattedAddress)}&lat=${lat}&lng=${lng}`;

    } catch (error) {
      console.error('Search error:', error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Could not find this address. Please try a different address.');
      }
    }
  };

  if (loadError) {
    return <div>Error loading Google Maps</div>;
  }

  return (
    <div className="flex flex-col items-center py-16 px-4">
      <h1 className="text-5xl md:text-6xl font-serif text-center mb-4">
        Find top-rated mobile car detailers
      </h1>
      
      <p className="text-gray-600 text-center mb-8">
        Carefully selected to ensure quality service and fair pricing you can count on
      </p>

      <div className="w-full max-w-2xl relative">
        <div className="flex flex-col">
          <div className="flex items-center bg-white rounded-full border shadow-sm">
            <div className="pl-4">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
            </div>
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                placeholder={isLoaded ? "Enter your address" : "Loading..."}
                disabled={!isLoaded}
                className="w-full px-4 py-2 border-none rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleSearch}
              className="bg-[#0A2217] text-white px-8 py-3 rounded-full hover:bg-[#0A2217]/90 transition-colors mr-1"
            >
              Search
            </button>
          </div>
          {error && (
            <div className="text-red-500 text-sm mt-2 text-center">
              {error}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500 mb-2">
          Connecting happy customers with the best detailers at the best price
        </p>
        <div className="flex justify-center -space-x-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="relative inline-block border-2 border-white rounded-full"
            >
              <Image
                src={`/images/avatar${i}.png`}
                alt={`Customer ${i}`}
                width={32}
                height={32}
                style={{ width: '32px', height: '32px' }}
                className="rounded-full object-cover"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 