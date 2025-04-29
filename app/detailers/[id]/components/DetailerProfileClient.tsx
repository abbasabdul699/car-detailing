'use client';

import { useState } from 'react';
import Image from 'next/image';
import { FaInstagram, FaTiktok, FaGlobe, FaShare } from 'react-icons/fa';
import Navbar from '@/app/components/Navbar';
import LocationMap from './LocationMap';
import ImageModal from './ImageModal';

interface DetailerImage {
  url: string;
  alt: string;
}

interface Detailer {
  id: string;
  businessName: string;
  email: string;
  phone: string;
  priceRange: string;
  description: string;
  services: string[];
  images: DetailerImage[];
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

interface DetailerProfileClientProps {
  detailer: Detailer;
}

export default function DetailerProfileClient({ detailer }: DetailerProfileClientProps) {
  const [selectedImage, setSelectedImage] = useState<DetailerImage | null>(null);

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="flex flex-col items-start gap-4 mb-8">
          {/* Profile and Map Container */}
          <div className="w-full flex justify-between items-start gap-8">
            {/* Profile Section */}
            <div className="flex flex-col gap-6 flex-1">
              {/* Profile Image */}
              <div className="relative w-40 h-40 rounded-lg overflow-hidden">
                <Image
                  src={detailer.images[0]?.url || '/images/default-profile.jpg'}
                  alt={detailer.businessName}
                  fill
                  className="object-cover"
                  priority
                  sizes="160px"
                />
              </div>

              {/* Business Info */}
              <div className="flex flex-col gap-4">
                <h1 className="text-4xl font-bold">{detailer.businessName}</h1>
                
                {/* Description */}
                <div className="max-w-2xl">
                  <p className="text-gray-600 text-base leading-relaxed">
                    {detailer.description}
                  </p>
                </div>

                {/* Service and Price Info */}
                <div className="grid grid-cols-2 gap-6 max-w-md">
                  {/* Service Column */}
                  <div className="flex flex-col">
                    <span className="text-gray-400 text-xs">Service</span>
                    <span className="text-base">Mobile Detailer</span>
                  </div>

                  {/* Price Range Column */}
                  <div className="flex flex-col">
                    <span className="text-gray-400 text-xs">Price range</span>
                    <span className="text-base">{detailer.priceRange}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button className="px-8 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition-colors">
                    Book
                  </button>
                  <button className="p-2 rounded-full border hover:bg-gray-50 transition-colors">
                    <FaInstagram className="w-5 h-5" />
                  </button>
                  <button className="p-2 rounded-full border hover:bg-gray-50 transition-colors">
                    <FaTiktok className="w-5 h-5" />
                  </button>
                  <button className="p-2 rounded-full border hover:bg-gray-50 transition-colors">
                    <FaGlobe className="w-5 h-5" />
                  </button>
                  <button className="p-2 rounded-full border hover:bg-gray-50 transition-colors">
                    <FaShare className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Map */}
            <LocationMap
              address={detailer.address}
              city={detailer.city}
              state={detailer.state}
              zipCode={detailer.zipCode}
              businessName={detailer.businessName}
            />
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="border-b mb-8">
          <ul className="flex gap-8">
            <li className="border-b-2 border-black pb-2 font-medium">Full detailing Packages</li>
            <li className="pb-2 text-gray-500 hover:text-black">Exterior</li>
            <li className="pb-2 text-gray-500 hover:text-black">Interior</li>
            <li className="pb-2 text-gray-500 hover:text-black">Paint Protection</li>
            <li className="pb-2 text-gray-500 hover:text-black">Additional Services</li>
          </ul>
        </nav>

        {/* Service Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="relative bg-green-50 p-6 rounded-xl">
            <span className="absolute top-4 left-4 text-xs px-2 py-1 bg-green-600 text-white rounded-full">
              Most Popular
            </span>
            <div className="mt-8">
              <h3 className="text-xl font-semibold mb-2">Exterior + Interior</h3>
              <p className="text-gray-600">
                Combines multiple services for a complete vehicle refresh
              </p>
            </div>
          </div>
          <div className="bg-white border p-6 rounded-xl">
            <div>
              <h3 className="text-xl font-semibold mb-2">Showroom Detail</h3>
              <p className="text-gray-600">
                High-end detailing for car shows or resale preparation
              </p>
            </div>
          </div>
          <div className="bg-white border p-6 rounded-xl">
            <div>
              <h3 className="text-xl font-semibold mb-2">Express or Maintenance Detailing</h3>
              <p className="text-gray-600">
                Quick detailing for regular upkeep
              </p>
            </div>
          </div>
        </div>

        {/* Portfolio Section */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Portfolio</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {detailer.images.map((image, index) => {
              console.log('Portfolio image:', image);
              return (
                <div 
                  key={index} 
                  className="relative aspect-square rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => {
                    console.log('Clicked image:', image);
                    setSelectedImage(image);
                  }}
                >
                  <Image
                    src={image.url}
                    alt={image.alt}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 20vw, 20vw"
                    loading="lazy"
                  />
                </div>
              );
            })}
          </div>
        </section>

        {/* Image Modal */}
        {selectedImage && (
          <div className="fixed inset-0 z-50 overflow-hidden bg-black bg-opacity-90">
            <ImageModal
              imageUrl={selectedImage.url}
              alt={selectedImage.alt}
              onClose={() => setSelectedImage(null)}
            />
          </div>
        )}
      </main>
    </>
  );
} 