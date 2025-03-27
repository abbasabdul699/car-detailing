"use client";
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from 'use-places-autocomplete';

declare global {
  interface Window {
    google: any;
  }
}

export default function SearchSection() {
  const router = useRouter();
  const {
    ready,
    value,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      types: ['address'],
      componentRestrictions: { country: 'us' },
    },
    debounce: 300,
  });

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const avatars = [
    '/images/avatar1.png',
    '/images/avatar2.png',
    '/images/avatar3.png',
    '/images/avatar4.png',
    '/images/avatar5.png',
  ];

  useEffect(() => {
    // Get user's location when component mounts
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }

    // Check if Google Maps script is loaded
    const checkGoogleMapsLoaded = () => {
      if (window.google && window.google.maps) {
        setGoogleMapsLoaded(true);
        // Initialize Google Places Autocomplete
        const autocomplete = new window.google.maps.places.AutocompleteService();
      } else {
        // If not loaded, check again in 100ms
        setTimeout(checkGoogleMapsLoaded, 100);
      }
    };

    checkGoogleMapsLoaded();
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    setShowSuggestions(true);
  };

  const handleSelect = async (description: string) => {
    setValue(description, false);
    clearSuggestions();
    setShowSuggestions(false);

    try {
      const results = await getGeocode({ address: description });
      const { lat, lng } = await getLatLng(results[0]);
      router.push(`/search-results?location=${encodeURIComponent(description)}&lat=${lat}&lng=${lng}`);
    } catch (error) {
      console.error('Error: ', error);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full px-4 pt-20">
        <div className="flex flex-col md:flex-row items-center justify-between">
          {/* Left side - Text and Search */}
          <div className="w-full md:w-1/2 md:pr-8">
            <h1 className="text-5xl font-serif mb-4">
              Find Top-Rated Mobile Car Detailers
            </h1>
            <p className="text-gray-600 mb-8">
              Carefully selected to ensure quality service and fair pricing you can count on
            </p>
            
            {/* Search Container */}
            <div className="w-full max-w-3xl mb-12 relative">
              <div className="flex items-center w-full bg-white rounded-full shadow-lg border border-gray-200">
                {/* Location Icon */}
                <div className="pl-6">
                  <svg 
                    className="w-5 h-5 text-gray-400"
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" 
                    />
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" 
                    />
                  </svg>
                </div>

                {/* Search Input */}
                <input
                  type="text"
                  placeholder="Enter your address"
                  className="flex-1 py-4 px-4 text-gray-600 placeholder-gray-400 focus:outline-none text-lg bg-transparent"
                  value={value}
                  onChange={handleInput}
                  disabled={!ready}
                />

                {/* Search Button with onClick handler */}
                <button 
                  onClick={() => handleSelect(value)}
                  className="m-1 px-12 py-4 bg-[rgba(10,34,23,1)] text-white rounded-full text-lg font-medium hover:bg-[rgba(10,34,23,0.9)] transition-colors"
                >
                  Search
                </button>
              </div>

              {/* Predictions Dropdown */}
              {status === 'OK' && showSuggestions && (
                <div className="absolute w-full mt-2 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                  {data.map((suggestion) => {
                    const {
                      place_id,
                      structured_formatting: { main_text, secondary_text },
                    } = suggestion;

                    return (
                      <div
                        key={place_id}
                        className="px-4 py-3 hover:bg-gray-100 cursor-pointer flex items-center"
                        onClick={() => handleSelect(suggestion.description)}
                      >
                        <svg 
                          className="w-5 h-5 text-gray-400 mr-3"
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={2} 
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" 
                          />
                        </svg>
                        <strong>{main_text}</strong> <span className="text-gray-500">{secondary_text}</span>
                      </div>
                    );
                  })}
                </div>
              )}
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
    </div>
  );
} 