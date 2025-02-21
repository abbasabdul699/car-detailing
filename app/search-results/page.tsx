"use client";

import { useState, useCallback, useEffect, Suspense } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { useSearchParams, useRouter } from 'next/navigation';
import Navbar from '@/app/components/Navbar';
import ClientOnly from './components/ClientOnly';
import DetailerCard from '@/app/(home)/components/DetailerCard';

interface DetailerCardProps {
  id: number;
  businessName: string;
  googleRating: number;
  priceRange: string;
  images: { url: string; alt: string }[];
  distance: number;
  services: { name: string; price: number }[];
  totalReviews: number;
}

interface Detailer extends DetailerCardProps {
  latitude: number;
  longitude: number;
}

interface MapMarker {
  id: number;
  position: {
    lat: number;
    lng: number;
  };
  businessName: string;
  priceRange: string;
  images: { url: string; alt: string }[];
}

// Add this custom map style (you can modify colors and features)
const mapStyles = [
  {
    "featureType": "all",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#f5f5f5"
      }
    ]
  },
  {
    "featureType": "all",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#616161"
      }
    ]
  },
  {
    "featureType": "all",
    "elementType": "labels.text.stroke",
    "stylers": [
      {
        "color": "#f5f5f5"
      }
    ]
  },
  {
    "featureType": "administrative.land_parcel",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#bdbdbd"
      }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#eeeeee"
      }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#e5e5e5"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#ffffff"
      }
    ]
  },
  {
    "featureType": "road.arterial",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#e9e9e9"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#9e9e9e"
      }
    ]
  }
];

const UserLocationMarker = () => {
  return (
    <div className="relative">
      {/* Main dot */}
      <div className="w-4 h-4 bg-blue-500 rounded-full" />
      
      {/* Pulsing circles */}
      <div className="absolute top-0 left-0">
        <div className="w-4 h-4 bg-blue-500 rounded-full animate-ping opacity-75" />
      </div>
      <div className="absolute top-0 left-0">
        <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse opacity-50" />
      </div>
    </div>
  );
};

const SearchResults = () => {
  return (
    <div className="min-h-screen bg-white">
      <main>
        <SearchResultsContent />
      </main>
    </div>
  );
};

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
  const [center, setCenter] = useState({
    lat: parseFloat(searchParams.get('lat') || '42.4440'),
    lng: parseFloat(searchParams.get('lng') || '-76.5019')
  });
  const [zoom, setZoom] = useState(12);
  const [detailers, setDetailers] = useState<Detailer[]>([]);
  const [loading, setLoading] = useState(true);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries: ['places']
  });

  // Set center based on search params
  useEffect(() => {
    if (searchParams) {
      setCenter({
        lat: parseFloat(searchParams.get('lat') || '42.4440'),
        lng: parseFloat(searchParams.get('lng') || '-76.5019')
      });
    }
  }, [searchParams]);

  // Fetch detailers when center changes
  useEffect(() => {
    const fetchDetailers = async () => {
      try {
        const response = await fetch(
          `/api/detailers?lat=${center.lat}&lng=${center.lng}&radius=50`
        );
        const data = await response.json();
        console.log('Fetched detailers:', data);
        setDetailers(data);
      } catch (error) {
        console.error('Error fetching detailers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetailers();
  }, [center]);

  // Adjust map bounds to show all markers
  useEffect(() => {
    if (map && detailers.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      
      // Add user location to bounds
      bounds.extend(center);
      
      // Add all detailer locations to bounds
      detailers.forEach((detailer) => {
        bounds.extend({
          lat: detailer.latitude,
          lng: detailer.longitude
        });
      });

      // Fit map to bounds with padding
      map.fitBounds(bounds, {
        padding: {
          top: 50,
          right: 50,
          bottom: 50,
          left: 50
        }
      });

      // Optional: Set a minimum zoom level to prevent too much zoom out
      const listener = google.maps.event.addListener(map, 'idle', () => {
        if (map.getZoom()! > 13) map.setZoom(13);
        google.maps.event.removeListener(listener);
      });
    }
  }, [map, detailers, center]);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  if (!isLoaded || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <ClientOnly>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow pt-16 relative">
          <div className="flex pb-8">
            {/* Left Side - Detailers List */}
            <div className="w-1/2 overflow-y-auto px-6">
              <h2 className="text-2xl font-semibold mb-6">
                {detailers.length} detailers near {searchParams.get('location') || 'you'}
              </h2>
              
              <div className="grid gap-6 mb-8">
                {detailers.map((detailer: Detailer) => {
                  const detailerCardProps: DetailerCardProps = {
                    id: detailer.id,
                    businessName: detailer.businessName,
                    googleRating: detailer.googleRating,
                    priceRange: detailer.priceRange,
                    images: detailer.images,
                    distance: detailer.distance,
                    services: detailer.services,
                    totalReviews: detailer.totalReviews
                  };

                  return (
                    <div 
                      key={detailer.id}
                      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => {
                        setSelectedMarker({
                          id: detailer.id,
                          position: {
                            lat: detailer.latitude,
                            lng: detailer.longitude
                          },
                          businessName: detailer.businessName,
                          priceRange: detailer.priceRange,
                          images: detailer.images
                        });
                        
                        if (map) {
                          map.panTo({ lat: detailer.latitude, lng: detailer.longitude });
                          map.setZoom(15);
                        }
                      }}
                    >
                      <DetailerCard {...detailerCardProps} />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Side - Map */}
            <div className="w-1/2 sticky top-16 h-[calc(100vh-4rem-2rem)]">
              <GoogleMap
                mapContainerStyle={{ 
                  width: '100%', 
                  height: '100%',
                  borderRadius: '0.5rem',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
                center={center}
                zoom={zoom}
                onLoad={onLoad}
                onUnmount={onUnmount}
                options={{
                  styles: mapStyles,
                  disableDefaultUI: true,
                  zoomControl: true,
                  fullscreenControl: true,
                  streetViewControl: false,
                  mapTypeControl: false,
                  controlSize: 24,
                  backgroundColor: '#f8f9fa',
                  restriction: {
                    latLngBounds: {
                      north: 85,
                      south: -85,
                      west: -180,
                      east: 180,
                    },
                    strictBounds: true,
                  },
                  maxZoom: 16,
                  minZoom: 10,
                }}
              >
                {/* User location marker with custom color */}
                <div>
                  <Marker
                    position={center}
                    icon={{
                      url: `data:image/svg+xml;charset=UTF-8,
                        <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="16" cy="16" r="8" fill="rgb(37, 99, 235)" />
                          <circle cx="16" cy="16" r="16" fill="rgb(37, 99, 235)" opacity="0.2">
                            <animate attributeName="r" from="8" to="16" dur="1.5s" repeatCount="indefinite" />
                            <animate attributeName="opacity" from="0.6" to="0" dur="1.5s" repeatCount="indefinite" />
                          </circle>
                        </svg>`,
                      anchor: new google.maps.Point(16, 16),
                    }}
                  />
                </div>
                
                {/* Detailer markers with updated image handling */}
                {detailers.map((detailer) => (
                  <Marker
                    key={detailer.id}
                    position={{
                      lat: detailer.latitude,
                      lng: detailer.longitude
                    }}
                    onClick={() => setSelectedMarker({
                      id: detailer.id,
                      position: {
                        lat: detailer.latitude,
                        lng: detailer.longitude
                      },
                      businessName: detailer.businessName,
                      priceRange: detailer.priceRange,
                      images: detailer.images
                    })}
                    icon={{
                      url: '/images/detailer-marker.png',
                      scaledSize: new google.maps.Size(32, 32),
                      anchor: new google.maps.Point(16, 16)
                    }}
                  />
                ))}

                {/* Enhanced InfoWindow with fixed size and no scroll */}
                {selectedMarker && (
                  <InfoWindow
                    position={selectedMarker.position}
                    onCloseClick={() => setSelectedMarker(null)}
                    options={{
                      pixelOffset: new google.maps.Size(0, -20),
                      maxWidth: 280,
                      disableAutoPan: true,
                    }}
                  >
                    <div className="p-3 bg-white rounded-lg shadow-md w-64 overflow-hidden">
                      <div className="flex flex-col">
                        <div className="w-full h-32 mb-2 overflow-hidden rounded-lg flex-shrink-0">
                          <img
                            src={selectedMarker.images[0]?.url || '/images/default-business.jpg'}
                            alt={selectedMarker.images[0]?.alt || selectedMarker.businessName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        
                        <div className="flex flex-col flex-shrink-0">
                          <h3 className="font-semibold text-gray-900 text-lg mb-1 truncate">
                            {selectedMarker.businessName}
                          </h3>
                          <p className="text-sm text-gray-600 mb-2">
                            {selectedMarker.priceRange}
                          </p>
                          
                          <button
                            onClick={() => {
                              router.push(`/detailers/${selectedMarker.id}`);
                            }}
                            className="mt-2 px-4 py-2 bg-[#0A2217] text-white rounded-lg hover:bg-[#0A2217]/90 transition-colors text-sm font-medium"
                          >
                            View Profile
                          </button>
                        </div>
                      </div>
                    </div>
                  </InfoWindow>
                )}
              </GoogleMap>
            </div>
          </div>
        </main>
      </div>
    </ClientOnly>
  );
}

export default SearchResults; 