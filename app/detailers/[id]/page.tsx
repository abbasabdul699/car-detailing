"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { ReactCompareSlider, ReactCompareSliderImage } from 'react-compare-slider';

interface DetailerProfile {
  id: number;
  businessName: string;
  googleRating: number;
  totalReviews: number;
  priceRange: string;
  services: {
    name: string;
    description: string;
    price: number;
  }[];
  images: {
    url: string;
    alt: string;
  }[];
  instagramUrl?: string;
  tiktokUrl?: string;
  websiteUrl?: string;
  address: string;
  latitude: number;
  longitude: number;
  distance?: number;
  beforeAfterImages?: {
    before: string;
    after: string;
  }[];
}

// Add this outside of the component
const libraries: ("places")[] = ["places"];

export default function DetailerProfile() {
    
  const params = useParams();
  const [detailer, setDetailer] = useState<DetailerProfile | null>(null);
  const [activeTab, setActiveTab] = useState('packages');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries: libraries  // Use the static libraries array
  });

  useEffect(() => {
    const fetchDetailer = async () => {
      try {
        console.log('Attempting to fetch detailer with ID:', params.id); // Debug log
        const response = await fetch(`/api/detailers/${params.id}`);
        const data = await response.json();
        
        console.log('Response status:', response.status); // Debug log
        console.log('Response data:', data); // Debug log
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}, message: ${data.error || 'Unknown error'}`);
        }
        
        if (!data) {
          throw new Error('No data received from server');
        }
        
        setDetailer(data);
      } catch (error) {
        console.error('Detailed error:', {
          message: error.message,
          stack: error.stack,
          params: params
        });
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchDetailer();
    } else {
      console.error('No ID provided in params');
    }
  }, [params]);

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="flex justify-center items-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
        <Footer />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div className="flex justify-center items-center min-h-screen">
          <div className="text-red-500">Error: {error}</div>
        </div>
        <Footer />
      </>
    );
  }

  if (!detailer) {
    return (
      <>
        <Navbar />
        <div className="flex justify-center items-center min-h-screen">
          <div className="text-gray-500">Detailer not found</div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-grow pt-16">
        {/* Header Section with Profile & Location */}
        <div className="bg-white">
          <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between">
              {/* Left Section: Profile Info & Socials */}
              <div className="flex flex-col">
                {/* Profile Info */}
                <div className="flex flex-col items-start">
                  {/* Image */}
                  <div className="w-[200px] h-[200px]">
                    <Image
                      src={detailer.images[0]?.url || '/images/default-avatar.jpg'}
                      alt={detailer.businessName}
                      width={200}
                      height={200}
                      className="rounded-lg w-full h-full object-cover"
                    />
                  </div>
                  
                  {/* Text content below image */}
                  <div className="mt-4 ml-auto"> {/* ml-auto pushes content to the right */}
                    <h1 className="text-4xl font-bold mb-2">{detailer.businessName}</h1>
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-400">★</span>
                      <span className="font-medium">{detailer.googleRating}</span>
                      <span className="text-gray-600">({detailer.totalReviews} reviews)</span>
                      <span className="mx-4 text-gray-300">|</span>
                      <span className="text-gray-600">Service: </span>
                      <span className="font-medium">Mobile Detailer</span>
                      <span className="mx-4 text-gray-300">|</span>
                      <span className="text-gray-600">Price range: </span>
                      <span className="font-medium">{detailer.priceRange}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 mt-6">
                  <button className="bg-black text-white px-8 py-3 rounded-full text-lg font-medium hover:bg-black/90 transition-colors">
                    Contact
                  </button>
                  <div className="flex gap-3">
                    {detailer.instagramUrl && (
                      <a 
                        href={detailer.instagramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-12 h-12 flex items-center justify-center rounded-full border border-gray-200 hover:bg-gray-50 transition-colors"
                      >
                        <Image src="/svg-profile-page/instagram.svg" alt="Instagram" width={24} height={24} />
                      </a>
                    )}
                    {detailer.tiktokUrl && (
                      <a 
                        href={detailer.tiktokUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-12 h-12 flex items-center justify-center rounded-full border border-gray-200 hover:bg-gray-50 transition-colors"
                      >
                        <Image src="/svg-profile-page/tiktok.svg" alt="TikTok" width={24} height={24} />
                      </a>
                    )}
                    {detailer.websiteUrl && (
                      <a 
                        href={detailer.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-12 h-12 flex items-center justify-center rounded-full border border-gray-200 hover:bg-gray-50 transition-colors"
                      >
                        <Image src="/svg-profile-page/globe.svg" alt="Website" width={24} height={24} />
                      </a>
                    )}
                    <button 
                      className="w-12 h-12 flex items-center justify-center rounded-full border border-gray-200 hover:bg-gray-50 transition-colors"
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                      }}
                    >
                      <Image src="/svg-profile-page/share.svg" alt="Share" width={24} height={24} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Section: Location Preview */}
              <div className="w-[600px] bg-gray-50 rounded-lg p-4">
                <div className="h-[300px] rounded-lg overflow-hidden mb-3">
                  {isLoaded && (
                    <GoogleMap
                      mapContainerStyle={{ width: '100%', height: '100%' }}
                      center={{
                        lat: detailer.latitude,
                        lng: detailer.longitude
                      }}
                      zoom={15}
                    >
                      <Marker
                        position={{
                          lat: detailer.latitude,
                          lng: detailer.longitude
                        }}
                        icon={{
                          url: '/images/detailer-marker.png',
                          scaledSize: new google.maps.Size(32, 32),
                        }}
                      />
                    </GoogleMap>
                  )}
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Image src="/images/location-pin.svg" alt="Location" width={16} height={16} />
                  <span>{detailer.address}</span>
                </div>
                <div className="mt-2 text-sm text-gray-500">
                  {detailer.distance && `${detailer.distance.toFixed(1)} mi`}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Before/After Section */}
        <div className="container mx-auto px-4 py-12">
          <h2 className="text-2xl font-semibold mb-8">Before & After</h2>
          <div className="max-w-4xl mx-auto">
            {detailer.beforeAfterImages && detailer.beforeAfterImages.length > 0 && (
              <div className="border-2 border-black bg-black p-1 rounded-lg">
                <ReactCompareSlider
                  itemOne={
                    <ReactCompareSliderImage
                      src={detailer.beforeAfterImages[0].before}
                      alt="Before detailing"
                      className="rounded-lg"
                    />
                  }
                  itemTwo={
                    <ReactCompareSliderImage
                      src={detailer.beforeAfterImages[0].after}
                      alt="After detailing"
                      className="rounded-lg"
                    />
                  }
                  position={50}
                  className="rounded-lg"
                  style={{ height: '500px' }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Packages Section */}
        <div className="container mx-auto px-4 py-8">
          <h2 className="text-2xl font-semibold mb-8">Full detailing Packages</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {detailer.services.map((service, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-2">{service.name}</h3>
                <p className="text-gray-600 mb-4">{service.description}</p>
                <p className="text-[#0A2217] font-semibold">${service.price}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Portfolio Section */}
        <div className="bg-gray-50 py-12">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-semibold mb-8">Portfolio</h2>
            <div className="columns-2 md:columns-3 lg:columns-4 gap-4">
              {detailer.images.map((image, index) => (
                <div 
                  key={index} 
                  className="break-inside-avoid mb-4"
                >
                  <div className="border-2 border-black bg-black p-1 rounded-lg">
                    <Image
                      src={image.url}
                      alt={image.alt}
                      width={800}
                      height={800}
                      className="rounded-lg w-full h-auto"
                      style={{ display: 'block' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
} 