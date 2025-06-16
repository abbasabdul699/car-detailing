'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { FaInstagram, FaTiktok, FaGlobe, FaShare, FaPhone, FaTimes, FaWhatsapp, FaFacebook } from 'react-icons/fa';
import { RiCalendarScheduleLine } from "react-icons/ri";
import Navbar from '@/app/components/Navbar';
import dynamic from 'next/dynamic';
import ImageModal from './ImageModal';
import { useRouter } from 'next/navigation';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';

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
  tiktok?: string;
  verified?: boolean;
  googlePlaceId?: string;
  facebook?: string;
}

interface DetailerProfileClientProps {
  detailer: Detailer;
  categories: Category[];
}

function timeAgo(date: Date) {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  const intervals = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'week', seconds: 604800 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 },
    { label: 'second', seconds: 1 },
  ];
  for (const interval of intervals) {
    const count = Math.floor(seconds / interval.seconds);
    if (count > 1) return `${count} ${interval.label}s ago`;
    if (count === 1) return `1 ${interval.label} ago`;
  }
  return 'just now';
}

function ArrowButton({ onClick, direction }: { onClick?: () => void; direction: 'left' | 'right' }) {
  return (
    <button
      onClick={onClick}
      aria-label={direction === 'left' ? 'Previous reviews' : 'Next reviews'}
      className={`absolute top-1/2 z-20 -translate-y-1/2 bg-white border border-gray-200 rounded-full w-9 h-9 flex items-center justify-center text-xl text-gray-500 hover:bg-gray-100 transition-colors
        ${direction === 'left' ? 'left-0 -translate-x-1/2' : 'right-0 translate-x-1/2'}`}
      style={{ outline: 'none' }}
      type="button"
    >
      {direction === 'left' ? (
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/></svg>
      ) : (
        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/></svg>
      )}
    </button>
  );
}

// Add SVG star icons
const FilledStar = () => (
  <svg className="w-5 h-5 text-yellow-400 inline-block" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.18c.969 0 1.371 1.24.588 1.81l-3.385 2.46a1 1 0 00-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.385-2.46a1 1 0 00-1.175 0l-3.385 2.46c-.784.57-1.838-.196-1.54-1.118l1.287-3.966a1 1 0 00-.364-1.118l-3.385-2.46c-.783-.57-.38-1.81.588-1.81h4.18a1 1 0 00.95-.69l1.286-3.967z"/></svg>
);
const EmptyStar = () => (
  <svg className="w-5 h-5 text-gray-300 inline-block" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 20 20"><path strokeLinecap="round" strokeLinejoin="round" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.18c.969 0 1.371 1.24.588 1.81l-3.385 2.46a1 1 0 00-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.385-2.46a1 1 0 00-1.175 0l-3.385 2.46c-.784.57-1.838-.196-1.54-1.118l1.287-3.966a1 1 0 00-.364-1.118l-3.385-2.46c-.783-.57-.38-1.81.588-1.81h4.18a1 1 0 00.95-.69l1.286-3.967z"/></svg>
);

// Use the provided SVG file for the Google verified badge
const GoogleVerifiedBadge = () => (
  <img src="/images/google-verified.svg" alt="Google Verified" className="w-5 h-5 ml-1 inline-block align-middle" />
);

function GoogleReviews({ placeId }: { placeId: string }) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [rating, setRating] = useState<number | null>(null);
  const [userRatingsTotal, setUserRatingsTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<{ [idx: number]: boolean }>({});
  const sliderRef = useRef<any>(null);

  useEffect(() => {
    if (!placeId) return;
    setLoading(true);
    fetch(`/api/google-reviews?placeId=${placeId}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setReviews(data.reviews || []);
          setRating(data.rating || null);
          setUserRatingsTotal(data.user_ratings_total || null);
        }
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to fetch Reviews');
        setLoading(false);
      });
  }, [placeId]);

  if (!placeId) return null;
  if (loading) return <div className="my-8">Loading Reviews...</div>;
  if (error) return <div className="my-8 text-red-600">{error}</div>;
  if (!reviews.length) return <div className="my-8 text-gray-500">No Google reviews found.</div>;

  const settings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 3,
    slidesToScroll: 1,
    centerMode: true,
    centerPadding: '0px',
    arrows: false,
    autoplay: true,
    autoplaySpeed: 3500,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 2,
          centerMode: false,
        },
      },
      {
        breakpoint: 640,
        settings: {
          slidesToShow: 1,
          centerMode: false,
        },
      },
    ],
  };

  return (
    <section className="my-8 relative">
      <h2 className="text-3xl font-bold mb-4">Reviews</h2>
      <p className="text-gray-500 mb-6 text-base">These are <a href="https://support.google.com/business/answer/3474122?hl=en" target="_blank" rel="noopener noreferrer" className="font-medium text-green-700 underline hover:text-green-800">verified Google reviews</a> from real customers.</p>
      <div className="flex items-center gap-4 mb-6">
        {rating && userRatingsTotal && (
          <span className="flex items-center text-lg font-semibold gap-2">
            <span className="text-gray-900 text-3xl font-extrabold">{rating}</span>
            {[...Array(5)].map((_, i) => (
              <FilledStar key={i} />
            ))}
            <span className="text-gray-500 font-normal">rating of {userRatingsTotal} reviews</span>
          </span>
        )}
      </div>
      <div className="relative py-8">
        <ArrowButton direction="left" onClick={() => sliderRef.current?.slickPrev()} />
        <ArrowButton direction="right" onClick={() => sliderRef.current?.slickNext()} />
        <Slider ref={sliderRef} {...settings} className="google-reviews-carousel">
          {reviews.map((review, idx) => {
            const reviewDate = new Date(review.time * 1000);
            return (
              <div key={idx} className="px-2">
                <div className={
                  `bg-[#f8f9f9] rounded-xl shadow p-6 flex flex-col h-full min-h-[260px] border border-gray-100 transition-transform duration-300
                  slick-slide-card`
                }>
                  {/* Header */}
                  <div className="flex items-center gap-3 bg-[#efefef] rounded-t-xl px-4 py-3 mb-4">
                    <img
                      src={review.profile_photo_url}
                      alt={review.author_name}
                      className="w-12 h-12 rounded-full object-cover border"
                    />
                    <div className="flex flex-col">
                      <span className="font-semibold text-lg text-[#313131]">{review.author_name}</span>
                      <span className="flex items-center gap-1 mt-1">
                        {[...Array(5)].map((_, i) => (
                          i < review.rating ? <FilledStar key={i} /> : <EmptyStar key={i} />
                        ))}
                        <GoogleVerifiedBadge />
                      </span>
                    </div>
                  </div>
                  {/* Review Text */}
                  <div className="flex-1 text-gray-600 text-base mb-4 px-2">
                    {review.text.length > 120 ? (
                      <>
                        {expanded[idx]
                          ? <>{review.text} <span className="text-blue-600 cursor-pointer" onClick={() => setExpanded(e => ({ ...e, [idx]: false }))}>Show Less</span></>
                          : <>{review.text.slice(0, 120)}... <span className="text-blue-600 cursor-pointer" onClick={() => setExpanded(e => ({ ...e, [idx]: true }))}>Show More</span></>
                        }
                      </>
                    ) : (
                      review.text
                    )}
                  </div>
                  {/* Footer */}
                  <div className="flex items-center justify-between mt-auto px-2 pt-2">
                    <div className="flex items-center gap-2">
                      <img src="/images/google-logo.svg" alt="Google" className="w-6 h-6" />
                      <span className="text-xs font-semibold text-[#313131]">Posted On Google</span>
                    </div>
                    <span className="text-xs text-gray-500">{timeAgo(reviewDate)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </Slider>
      </div>
    </section>
  );
}

const LocationMap = dynamic(() => import('./LocationMap'), { ssr: false });

export default function DetailerProfileClient({ detailer, categories }: DetailerProfileClientProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<string>(categories[0]?.id || '');
  const [showContactModal, setShowContactModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [showVerifiedModal, setShowVerifiedModal] = useState(false);
  const router = useRouter();

  const handleBookNow = () => {
    router.push(`/book/${detailer.id}/service`);
  };

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

  useEffect(() => {
    if (detailer?.id) {
      fetch('/api/visitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ detailerId: detailer.id }),
      });
    }
  }, [detailer?.id]);

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8 mt-16">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row items-start gap-8 mb-8">
          {/* Left: Profile Info */}
          <div className="flex-1 flex flex-col gap-6 w-full max-w-2xl md:ml-0 md:mr-auto text-left">
            {/* Profile Image */}
            <div className="relative w-40 h-40 rounded-xl overflow-hidden">
              <Image
                src={profileImage?.url || '/images/default-profile.svg'}
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
                  <button
                    type="button"
                    title="Verified business"
                    className="inline-block align-middle focus:outline-none"
                    onClick={() => setShowVerifiedModal(true)}
                    style={{ background: 'none', border: 'none', padding: 0, margin: 0, cursor: 'pointer' }}
                  >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="12" fill="#22c55e"/>
                      <path d="M7 13l3 3 7-7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
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
                  onClick={handleBookNow}
                  className="px-8 py-2 text-white rounded-full transition-colors flex items-center gap-2"
                  style={{
                    backgroundColor: '#006400',
                    // Optional: slightly lighter on hover
                    transition: 'background 0.2s',
                  }}
                  onMouseOver={e => (e.currentTarget.style.backgroundColor = '#008000')}
                  onMouseOut={e => (e.currentTarget.style.backgroundColor = '#006400')}
                >
                  <RiCalendarScheduleLine className="w-5 h-5" />
                  Book Now
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
                {detailer.tiktok && (
                  <a
                    href={detailer.tiktok}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-full border hover:bg-gray-50 transition-colors"
                    title="TikTok"
                  >
                    <FaTiktok className="w-5 h-5" />
                  </a>
                )}
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
                {detailer.facebook && (
                  <a
                    href={detailer.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-full border hover:bg-gray-50 transition-colors"
                    title="Facebook"
                  >
                    <FaFacebook className="w-5 h-5" />
                  </a>
                )}
                <button className="p-2 rounded-full border hover:bg-gray-50 transition-colors" onClick={handleShare} title="Share profile">
                  <FaShare className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Right: Why Book With Us */}
          <aside className="w-full md:w-96 flex-shrink-0">
            <section className="bg-white rounded-xl shadow p-6 border border-gray-200">
              <h2 className="text-2xl font-bold mb-4">Why Book With Us?</h2>
              <ul className="space-y-6">
                <li className="flex items-start gap-4">
                  {/* Doorstep icon */}
                  <svg className="w-8 h-8 text-green-700 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <rect x="3" y="7" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
                    <path d="M16 3v4M8 3v4" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="12" cy="16" r="1" fill="currentColor"/>
                  </svg>
                  <div>
                    <span className="font-semibold text-lg">Right to your doorstep</span>
                    <div className="text-gray-500">We come to you for maximum convenience.</div>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  {/* Convenience icon */}
                  <svg className="w-8 h-8 text-green-700 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path d="M12 8v4l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  <div>
                    <span className="font-semibold text-lg">Convenience made easy</span>
                    <div className="text-gray-500">Book online and enjoy hassle-free service at your location.</div>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  {/* No damage icon */}
                  <svg className="w-8 h-8 text-green-700 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <rect x="4" y="7" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
                    <path d="M8 11l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <div>
                    <span className="font-semibold text-lg">No damages or scratches</span>
                    <div className="text-gray-500">Our professionals use safe, high-quality products, and techniques.</div>
                  </div>
                </li>
              </ul>
            </section>
          </aside>
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
          {/* Move 'Full Detail' to the first position */}
          {(() => {
            const services = categorizedServices[activeTab] || [];
            const fullDetailIdx = services.findIndex(s => s.name.toLowerCase() === 'full detail');
            let ordered = services;
            if (fullDetailIdx > 0) {
              // Move 'Full Detail' to the front
              ordered = [services[fullDetailIdx], ...services.slice(0, fullDetailIdx), ...services.slice(fullDetailIdx + 1)];
            }
            return ordered.map((service, index) => {
              const isFullDetail = service.name.toLowerCase() === 'full detail';
              return (
            <div
              key={service.id}
                  className={`p-6 rounded-xl flex flex-col items-center text-center border transition-all relative
                    ${isFullDetail
                      ? 'border-green-200 bg-green-50'
                      : 'border-gray-200 bg-white'}
                  `}
                  style={isFullDetail ? { boxShadow: '0 0 0 2px #22c55e1A' } : {}}
                >
                  {/* Most Popular Tag for Full Detail */}
                  {isFullDetail && (
                    <div className="absolute top-4 left-4 bg-green-900 text-white text-xs font-semibold px-3 py-1 rounded-full shadow" style={{zIndex:2}}>
                      Most Popular
                    </div>
                  )}
              {service.icon && (
                <img
                  src={service.icon}
                  alt={service.name + ' icon'}
                  className="w-10 h-10 mb-2 mx-auto"
                />
              )}
              <h3 className="text-xl font-semibold mb-2">{service.name}</h3>
                  <p className="text-gray-400 font-medium">
                {service.description}
              </p>
            </div>
              );
            });
          })()}
          {(!categorizedServices[activeTab] || categorizedServices[activeTab].length === 0) && (
            <div className="col-span-3 text-center py-8 text-gray-500">
              No services available in this category
            </div>
          )}
        </div>
        <hr className="my-8 border-gray-200" />

        {/* Portfolio Section */}
        <section>
          <h2 className="text-3xl font-bold mb-6">Portfolio</h2>
          <p className="text-gray-500 mb-6 text-base">
            Experience the craftsmanship. View authentic detailing transformations from recent clients.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {portfolioImages.map((image, index) => (
              <div 
                key={index} 
                className="relative aspect-square rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setSelectedImageIndex(index)}
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
        <hr className="my-8 border-gray-200" />

        {/* Reviews Section - moved above map */}
        {detailer.googlePlaceId && <GoogleReviews placeId={detailer.googlePlaceId} />}
        <hr className="my-8 border-gray-200" />

        {/* Map Section - now below reviews */}
        <div className="w-full max-w-7xl mx-auto mt-8">
          <h2 className="text-3xl font-bold mb-2">Servicable Area</h2>
          <div className="w-full h-64 md:h-80 overflow-hidden">
            <LocationMap
              address={detailer.address}
              city={detailer.city}
              state={detailer.state}
              zipCode={detailer.zipCode}
              businessName={detailer.businessName}
            />
          </div>
          <div className="mt-4 text-gray-700 text-md">
            The green circle shows an estimated <b>30-mile radius</b> from the detailer's location.
            This is a general estimate of possible serviceable areas. Actual service coverage may vary.
          </div>
          <div className="mt-4 text-gray-500 text-md flex items-center gap-2">
            <span>
              <b>Location accuracy:</b> The detailer's location is based on the address provided and may not be exact.
            </span>
            <button
              className="underline text-blue-600 hover:text-blue-800"
              onClick={() => setShowMapModal(true)}
              type="button"
            >
              Learn more
            </button>
          </div>
        </div>

        {showMapModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 relative shadow-lg">
              <button
                onClick={() => setShowMapModal(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl"
                aria-label="Close"
              >
                &times;
              </button>
              <h3 className="text-xl font-bold mb-4">How service areas and locations are shown</h3>
              <p className="mb-2">
                The green circle on the map is a visual estimate of a <b>30-mile radius</b> from the detailer's address. This is intended to help you understand the general area the detailer may be able to serve.
              </p>
              <p className="mb-2">
                The actual serviceable area may be larger or smaller, depending on the detailer's policies and availability. Please contact the detailer directly to confirm if your location is within their service area.
              </p>
              <p>
                The detailer's location is based on the address they provided. We do not guarantee the exactness of this location.
              </p>
            </div>
          </div>
        )}

        {showVerifiedModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 relative shadow-lg">
              <button
                onClick={() => setShowVerifiedModal(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl"
                aria-label="Close"
              >
                &times;
              </button>
              <h3 className="text-xl font-bold mb-4">What does "Verified" mean?</h3>
              <p>
                This detailer has been verified by ReevaCar. Verification means we have confirmed the business's identity and/or address through documentation, online presence, or other means. However, we always recommend you do your own due diligence before booking.
              </p>
            </div>
          </div>
        )}

        {selectedImageIndex !== null && (
          <div className="fixed inset-0 z-50 overflow-hidden bg-black bg-opacity-90 flex items-center justify-center">
            <ImageModal
              images={portfolioImages}
              currentIndex={selectedImageIndex}
              onClose={() => setSelectedImageIndex(null)}
              onPrev={() => setSelectedImageIndex(i => (i! - 1 + portfolioImages.length) % portfolioImages.length)}
              onNext={() => setSelectedImageIndex(i => (i! + 1) % portfolioImages.length)}
            />
          </div>
        )}
      </main>
      <style jsx global>{`
        .google-reviews-carousel .slick-center .slick-slide-card {
          transform: scale(1.08);
          box-shadow: 0 8px 32px rgba(0,0,0,0.10), 0 1.5px 6px rgba(0,0,0,0.08);
          z-index: 2;
          border-color: #d1fae5;
          background: #fff;
        }
        .google-reviews-carousel .slick-slide:not(.slick-center) .slick-slide-card {
          opacity: 0.7;
          transform: scale(0.96);
          z-index: 1;
        }
      `}</style>
    </>
  );
} 