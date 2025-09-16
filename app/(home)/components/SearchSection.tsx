"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useLoadScript } from '@react-google-maps/api';
import { GOOGLE_MAPS_LIBRARIES } from '@/lib/googleMaps';
import { motion } from 'framer-motion';

declare global {
  interface Window {
    google: typeof google;
  }
}

export default function SearchSection() {
  const router = useRouter();
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: GOOGLE_MAPS_LIBRARIES as any,
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
      const currentInput = inputRef.current?.value || '';
      if (!currentInput.trim()) {
        setError('Please enter an address');
        return;
      }

      if (!isLoaded || !window.google) {
        setError('Google Maps is not loaded yet. Please try again in a moment.');
        return;
      }

      const geocoder = new window.google.maps.Geocoder();
      const result = await new Promise<google.maps.GeocoderResult>((resolve, reject) => {
        geocoder.geocode({ address: currentInput }, (results, status) => {
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
    <div className="flex flex-col items-center py-20 px-4 relative z-10">
      <div className="text-center mb-12">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          viewport={{ once: true }}
          className="text-5xl md:text-7xl font-serif text-center mb-6 bg-gradient-to-r from-gray-900 via-green-900 to-green-700 bg-clip-text text-transparent"
        >
          Find top-rated mobile car detailers
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          viewport={{ once: true }}
          className="text-gray-600 text-lg md:text-xl text-center mb-8 max-w-2xl mx-auto leading-relaxed"
        >
          Carefully selected to ensure quality service and fair pricing you can count on
        </motion.p>
      </div>

      <div className="w-full max-w-3xl relative">
        <div className="flex flex-col">
          <div className="flex items-center glass-effect organic-border fluid-shadow hover:fluid-shadow-hover smooth-transition">
            <div className="pl-6">
              <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
            </div>
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                placeholder={isLoaded ? "Enter your address" : "Loading..."}
                disabled={!isLoaded}
                className="w-full px-6 py-4 border-none rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 bg-transparent text-lg placeholder-gray-400"
              />
            </div>
            <button
              onClick={handleSearch}
              className="bg-gradient-to-r from-[#0A2217] to-[#1a4a3a] text-white px-10 py-4 rounded-2xl hover:from-[#1a4a3a] hover:to-[#0A2217] smooth-transition transform hover:scale-105 hover:shadow-xl mr-2 font-medium text-lg"
            >
              Search
            </button>
          </div>
          {error && (
            <div className="text-red-500 text-sm mt-4 text-center bg-red-50 rounded-2xl px-4 py-2 border border-red-200 smooth-transition">
              {error}
            </div>
          )}
        </div>
      </div>

      <div className="mt-12 text-center">
        <p className="text-sm text-gray-500 mb-4 font-medium">
          Connecting happy customers with the best detailers at the best price
        </p>
        <div className="flex justify-center -space-x-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="relative inline-block border-3 border-white rounded-full fluid-shadow hover:scale-110 smooth-transition"
            >
              <Image
                src={`/images/avatar${i}.png`}
                alt={`Customer ${i}`}
                width={40}
                height={40}
                style={{ width: '40px', height: '40px' }}
                className="rounded-full object-cover"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
