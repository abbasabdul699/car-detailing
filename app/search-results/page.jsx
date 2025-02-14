"use client";

import { useState, useCallback, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, LoadScript } from '@react-google-maps/api';
import Navbar from '@/app/(home)/components/Navbar';
import Footer from '@/app/(home)/components/Footer';
import Script from 'next/script';

const containerStyle = {
  width: '100%',
  height: '700px'
};

const SearchResults = () => {
  const [sortBy, setSortBy] = useState('recommended');
  const [map, setMap] = useState(null);
  const [center, setCenter] = useState({
    lat: 42.4440,
    lng: -76.5019
  });
  
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  });

  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Initializing map...');
  const [mapLoaded, setMapLoaded] = useState(false);

  const onLoad = useCallback((map) => {
    setMap(map);
    setMapLoaded(true);
  }, []);

  const onUnmount = useCallback((map) => {
    setMap(null);
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      setLoadingMessage('Getting your location...');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCenter({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setLoadingMessage('Loading map...');
          setTimeout(() => {
            setIsLoading(false);
          }, 1000);
        },
        (error) => {
          console.log("Error getting location:", error);
          setLoadingMessage('Using default location...');
          setTimeout(() => {
            setIsLoading(false);
          }, 1000);
        },
        {
          timeout: 10000,
          maximumAge: 0,
          enableHighAccuracy: true
        }
      );
    } else {
      setLoadingMessage('Location services not available');
      setTimeout(() => {
        setIsLoading(false);
      }, 1000);
    }
  }, []);

  const initMap = () => {
    if (window.google && !map) {
      const mapInstance = new window.google.maps.Map(document.getElementById("map"), {
        center: center,
        zoom: 13,
        styles: [
          {
            featureType: "all",
            elementType: "geometry",
            stylers: [{ color: "#242f3e" }]
          },
          {
            featureType: "all",
            elementType: "labels.text.stroke",
            stylers: [{ color: "#242f3e" }]
          },
          {
            featureType: "all",
            elementType: "labels.text.fill",
            stylers: [{ color: "#746855" }]
          },
          {
            featureType: "water",
            elementType: "geometry",
            stylers: [{ color: "#17263c" }]
          }
        ],
        disableDefaultUI: true,
        zoomControl: true,
      });

      new window.google.maps.Marker({
        position: center,
        map: mapInstance,
        title: "Your Location"
      });

      setMap(mapInstance);
    }
  };

  const detailers = [
    {
      id: 1,
      name: "73 Automotive",
      image: "/detailer1.jpg",
      rating: "5-$$",
      price: "$50 (59)",
      type: "Mobile Detailer",
      distance: "5.1 miles",
      coordinates: { lat: 42.4440, lng: -76.5019 } // Add actual coordinates for each detailer
    },
    // Add more detailers with similar format
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`}
        onLoad={initMap}
        strategy="afterInteractive"
      />
      
      <Navbar />
      
      {/* Main content with flex-grow to push footer down */}
      <main className="flex-grow pt-16">
        {/* Search results content goes here */}
        <div className="flex flex-1 pt-16">
          {/* Left Side - Detailers List */}
          <div className="w-1/2 overflow-y-auto px-6">
            <h2 className="text-lg font-semibold mb-4">{detailers.length} detailers near you</h2>
            
            <div className="grid gap-4">
              {detailers.map((detailer) => (
                <div 
                  key={detailer.id}
                  className="bg-white rounded-lg border hover:shadow-lg transition-shadow cursor-pointer"
                >
                  <div className="relative">
                    <img
                      src={detailer.image}
                      alt={detailer.name}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                    <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-2 py-1 rounded-full text-sm">
                      {detailer.rating}
                    </div>
                    <div className="absolute top-4 right-4 bg-black bg-opacity-50 text-white px-2 py-1 rounded-full text-sm">
                      {detailer.price}
                    </div>
                  </div>
                  
                  <div className="p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gray-200">
                      {/* Profile image */}
                    </div>
                    <div>
                      <h3 className="font-semibold">{detailer.name}</h3>
                      <p className="text-gray-500 text-sm">{detailer.type}</p>
                    </div>
                    <div className="ml-auto text-gray-500 text-sm">
                      {detailer.distance}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Side - Map */}
          <div className="w-1/2 fixed right-0 top-28 bottom-0">
            <section className="w-full relative">
              {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 bg-opacity-90 z-10">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#0A2217] border-t-transparent mb-4"></div>
                  <p className="text-[#0A2217] text-lg font-medium animate-pulse">
                    {loadingMessage}
                  </p>
                </div>
              )}
              
              <div 
                id="map" 
                className="w-full h-[700px]"
              />
            </section>
          </div>
        </div>
      </main>

      {/* Footer will stay at bottom */}
      <Footer />
    </div>
  );
};

export default SearchResults; 