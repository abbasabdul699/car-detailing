'use client';

import { useState } from 'react';
import Image from 'next/image';
import { FaInstagram, FaTiktok, FaGlobe, FaShare, FaPhone, FaTimes, FaWhatsapp } from 'react-icons/fa';
import Navbar from '@/app/components/Navbar';
import LocationMap from './LocationMap';
import ImageModal from './ImageModal';

interface DetailerImage {
  url: string;
  alt: string;
  type: string;
}

interface Service {
  id: string;
  name: string;
  category: {
    id: string;
    name: string;
    description?: string | null;
    icon?: string | null;
  };
  icon?: string;
  description: string;
}

interface Category {
  id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
}

interface Detailer {
  id: string;
  businessName: string;
  email: string;
  phone: string;
  priceRange: string;
  description: string;
  services: Service[];
  images: DetailerImage[];
  address: string;
  city: string;
  state: string;
  zipCode: string;
  website?: string;
  instagram?: string;
  verified?: boolean;
}

interface DetailerProfileClientProps {
  detailer: Detailer;
  categories: Category[];
}

export default function DetailerProfileClient({ detailer, categories }: DetailerProfileClientProps) {
  const [selectedImage, setSelectedImage] = useState<DetailerImage | null>(null);
  const [activeTab, setActiveTab] = useState<string>(categories[0]?.id || '');
  const [showContactModal, setShowContactModal] = useState(false);

  const handleContact = () => {
    // Check if the device is mobile
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
      // If mobile, directly initiate the call
      window.location.href = `tel:${detailer.phone}`;
    } else {
      // If desktop, show the modal
      setShowContactModal(true);
    }
  };

  const handleShare = () => {
    const shareUrl = window.location.href;
    const shareData = {
      title: detailer.businessName,
      text: `Check out ${detailer.businessName} on ReevaCar!`,
      url: shareUrl,
    };
    if (navigator.share) {
      navigator.share(shareData).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert('Profile link copied to clipboard!');
    }
  };

  // Format phone number for display
  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return '(' + match[1] + ') ' + match[2] + '-' + match[3];
    }
    return phone;
  };

  console.log('Detailer data:', detailer);

  // Group services by category id
  const categorizedServices: Record<string, Service[]> = {};
  categories.forEach(cat => {
    categorizedServices[cat.id] = detailer.services.filter(s => {
      // Handle both populated category objects and fallback to categoryId string
      if (typeof s.category === 'object' && s.category !== null && 'id' in s.category) {
        return s.category.id === cat.id;
      }
      // Fallback: if service has categoryId (string)
      if ('categoryId' in s && typeof (s as any).categoryId === 'string') {
        return (s as any).categoryId === cat.id;
      }
      return false;
    });
  });

  // Select profile image and portfolio images
  const profileImage = detailer.images.find(img => img.type === 'profile') || detailer.images[0];
  const portfolioImages = detailer.images.filter(img => img.type === 'portfolio');

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="flex flex-col items-start gap-4 mb-8">
          {/* Profile Section */}
          <div className="flex flex-col gap-6 w-full max-w-2xl md:ml-0 md:mr-auto text-left">
            {/* Profile Image */}
            <div className="relative w-40 h-40 rounded-xl overflow-hidden">
              <Image
                src={profileImage?.url || '/images/default-profile.jpg'}
                alt={profileImage?.alt || detailer.businessName}
                fill
                className="object-cover"
                priority
                sizes="160px"
              />
            </div>

            {/* Business Info */}
            <div className="flex flex-col gap-4">
              <h1 className="text-4xl font-bold flex items-center gap-2">
                {detailer.businessName}
                {detailer.verified && (
                  <span title="Verified business" className="inline-block align-middle">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="12" fill="#22c55e"/>
                      <path d="M7 13l3 3 7-7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                )}
              </h1>
              
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
                <button 
                  onClick={handleContact}
                  className="px-8 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition-colors flex items-center gap-2"
                >
                  <FaPhone className="w-4 h-4 transform -scale-x-100" />
                  Contact
                </button>
                {detailer.instagram && (
                  <a
                    href={detailer.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-full border hover:bg-gray-50 transition-colors"
                    title="Instagram"
                  >
                    <FaInstagram className="w-5 h-5" />
                  </a>
                )}
                <button className="p-2 rounded-full border hover:bg-gray-50 transition-colors">
                  <FaTiktok className="w-5 h-5" />
                </button>
                {detailer.website && (
                  <a 
                    href={detailer.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-full border hover:bg-gray-50 transition-colors"
                    title="Visit website"
                  >
                    <FaGlobe className="w-5 h-5" />
                  </a>
                )}
                <button className="p-2 rounded-full border hover:bg-gray-50 transition-colors" onClick={handleShare} title="Share profile">
                  <FaShare className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
          {/* Map Section */}
          <div className="w-full max-w-7xl mx-auto mt-8">
            <div className="w-full h-64 md:h-80 overflow-hidden">
              <LocationMap
                address={detailer.address}
                city={detailer.city}
                state={detailer.state}
                zipCode={detailer.zipCode}
                businessName={detailer.businessName}
              />
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="border-b mb-8">
          <ul className="flex gap-8">
            {categories.map(cat => (
              <li
                key={cat.id}
                className={`pb-2 cursor-pointer ${activeTab === cat.id ? 'border-b-2 border-black font-medium' : 'text-gray-500 hover:text-black'}`}
                onClick={() => setActiveTab(cat.id)}
              >
                {cat.name}
              </li>
            ))}
          </ul>
        </nav>

        {/* Service Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {categorizedServices[activeTab] && categorizedServices[activeTab].map((service, index) => (
            <div
              key={service.id}
              className={`p-6 rounded-xl flex flex-col items-center text-center bg-white border`}
            >
              {service.icon && (
                <img
                  src={service.icon}
                  alt={service.name + ' icon'}
                  className="w-10 h-10 mb-2 mx-auto"
                />
              )}
              <h3 className="text-xl font-semibold mb-2">{service.name}</h3>
              <p className="text-gray-600">
                {service.description}
              </p>
            </div>
          ))}
          {(!categorizedServices[activeTab] || categorizedServices[activeTab].length === 0) && (
            <div className="col-span-3 text-center py-8 text-gray-500">
              No services available in this category
            </div>
          )}
        </div>

        {/* Portfolio Section */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Portfolio</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {portfolioImages.map((image, index) => (
              <div 
                key={index} 
                className="relative aspect-square rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setSelectedImage(image)}
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
            ))}
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

        {/* Contact Modal for Desktop */}
        {showContactModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 relative">
              <button 
                onClick={() => setShowContactModal(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
              >
                <FaTimes className="w-5 h-5" />
              </button>
              
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaPhone className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Contact {detailer.businessName}</h3>
                <p className="text-gray-600 mb-6">Choose how you'd like to reach out</p>
              </div>

              <div className="space-y-4">
                <a 
                  href={`tel:${detailer.phone}`}
                  className="w-full flex items-center justify-center gap-3 bg-black text-white py-3 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <FaPhone className="w-5 h-5" />
                  <span>{formatPhoneNumber(detailer.phone)}</span>
                </a>
                
                <a 
                  href={`https://wa.me/${detailer.phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-3 bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 transition-colors"
                >
                  <FaWhatsapp className="w-5 h-5" />
                  <span>WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
} 