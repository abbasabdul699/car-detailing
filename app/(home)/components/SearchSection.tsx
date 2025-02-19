"use client";
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

// Define types for Google Places
type GooglePrediction = {
  description: string;
  place_id: string;
};

declare global {
  interface Window {
    google: {
      maps: {
        places: {
          AutocompleteService: new () => google.maps.places.AutocompleteService;
          PlacesServiceStatus: {
            OK: string;
          };
        };
      };
    };
  }
}

const SearchSection = () => {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState('');
  const autoCompleteRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const [autocompletePredictions, setAutocompletePredictions] = useState<GooglePrediction[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);
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
        autoCompleteRef.current = autocomplete;
      } else {
        // If not loaded, check again in 100ms
        setTimeout(checkGoogleMapsLoaded, 100);
      }
    };

    checkGoogleMapsLoaded();
  }, []);

  const handleInputChange = async (value: string) => {
    setSearchInput(value);
    
    if (value.length > 2 && googleMapsLoaded && autoCompleteRef.current) {
      try {
        const predictions = await new Promise<GooglePrediction[]>((resolve, reject) => {
          autoCompleteRef.current?.getPlacePredictions(
            {
              input: value,
              componentRestrictions: { country: "us" }, // Restrict to US addresses
              types: ['address'] // Only return address predictions
            },
            (results, status) => {
              if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
                resolve(results as GooglePrediction[]);
              } else {
                reject(new Error(`Google Places API error: ${status}`));
              }
            }
          );
        });
        
        setAutocompletePredictions(predictions);
        setShowPredictions(true);
      } catch (err: unknown) {
        const error = err as Error;
        console.error('Error fetching predictions:', error.message);
        setAutocompletePredictions([]);
        setShowPredictions(false);
      }
    } else {
      setAutocompletePredictions([]);
      setShowPredictions(false);
    }
  };

  const handlePredictionSelect = (prediction: GooglePrediction) => {
    setSearchInput(prediction.description);
    setShowPredictions(false);
    // Handle the search with the selected address
    handleSearch(prediction.description);
  };

  const handleSearch = async (address: string) => {
    if (!address) return;

    try {
      // Geocode the address using Google Maps Geocoding API
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          address
        )}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
      );
      
      const data = await response.json();
      
      if (data.results && data.results[0]) {
        const { lat, lng } = data.results[0].geometry.location;
        // Navigate to search results with coordinates
        router.push(`/search-results?lat=${lat}&lng=${lng}&location=${encodeURIComponent(address)}`);
      } else {
        alert('Location not found. Please try again.');
      }
    } catch (error) {
      console.error('Error geocoding address:', error);
      alert('Error finding location. Please try again.');
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
                  value={searchInput}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder="Search city, zip, or address"
                  className="flex-1 py-4 px-4 text-gray-600 placeholder-gray-400 focus:outline-none text-lg bg-transparent"
                />

                {/* Search Button with onClick handler */}
                <button 
                  onClick={() => handleSearch(searchInput)}
                  className="m-1 px-12 py-4 bg-[rgba(10,34,23,1)] text-white rounded-full text-lg font-medium hover:bg-[rgba(10,34,23,0.9)] transition-colors"
                >
                  Search
                </button>
              </div>

              {/* Predictions Dropdown */}
              {showPredictions && autocompletePredictions.length > 0 && (
                <div className="absolute w-full mt-2 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                  {autocompletePredictions.map((prediction) => (
                    <div
                      key={prediction.place_id}
                      className="px-4 py-3 hover:bg-gray-100 cursor-pointer flex items-center"
                      onClick={() => handlePredictionSelect(prediction)}
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
                      <span>{prediction.description}</span>
                    </div>
                  ))}
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
};

export default SearchSection; 