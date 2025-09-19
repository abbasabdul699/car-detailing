'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { FaInstagram, FaTiktok, FaGlobe, FaShare, FaPhone, FaTimes, FaWhatsapp } from 'react-icons/fa';
import Navbar from '@/app/components/Navbar';
import ImageModal from './ImageModal';
import ContactForm from './ContactForm';
import { useRouter } from 'next/navigation';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import dynamic from 'next/dynamic';

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

interface ServiceInBundle {
  id: string;
  name: string;
}

interface BundleService {
  service: ServiceInBundle;
}

interface Bundle {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl?: string;
  services: BundleService[];
}

interface Review {
  id: string;
  authorName: string;
  rating: number;
  comment: string;
  reply?: string | null;
  createdAt: string;
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
  googlePlaceId?: string;
  facebook?: string;
  bundles?: Bundle[];
  reviews?: Review[];
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
      <h2 className="text-3xl font-bold mb-4">Google Reviews</h2>
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

// New Component for Star Ratings
const StarRating = ({ rating, setRating }: { rating: number, setRating?: (rating: number) => void }) => {
  const isInteractive = !!setRating;
  return (
    <div className="flex items-center">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          onClick={isInteractive ? () => setRating(star) : undefined}
          className={`w-6 h-6 ${rating >= star ? 'text-yellow-400' : 'text-gray-300'} ${isInteractive ? 'cursor-pointer' : ''}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.18c.969 0 1.371 1.24.588 1.81l-3.385 2.46a1 1 0 00-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.385-2.46a1 1 0 00-1.175 0l-3.385 2.46c-.784.57-1.838-.196-1.54-1.118l1.287-3.966a1 1 0 00-.364-1.118l-3.385-2.46c-.783-.57-.38-1.81.588-1.81h4.18a1 1 0 00.95-.69l1.286-3.967z" />
        </svg>
      ))}
    </div>
  );
};

// New Modal Component for Leaving a Review
const LeaveReviewModal = ({
  isOpen,
  onClose,
  detailerId,
  onReviewSubmitted,
}: {
  isOpen: boolean;
  onClose: () => void;
  detailerId: string;
  onReviewSubmitted: (newReview: Review) => void;
}) => {
  const [authorName, setAuthorName] = useState('');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setError('Please select a rating.');
      return;
    }
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ detailerId, authorName, rating, comment }),
      });
      if (!res.ok) throw new Error('Failed to submit review.');
      const newReview = await res.json();
      onReviewSubmitted(newReview);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-lg relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-2xl text-gray-500 hover:text-gray-800">&times;</button>
        <h2 className="text-xl font-bold mb-6">Leave a Review</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
            <input value={authorName} onChange={(e) => setAuthorName(e.target.value)} className="w-full border rounded-lg p-2" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
            <StarRating rating={rating} setRating={setRating} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Comment</label>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} className="w-full border rounded-lg p-2 h-24" required />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex justify-end gap-4">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-200">Cancel</button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function DetailerProfileClient({ detailer: initialDetailer, categories }: DetailerProfileClientProps) {
  const [detailer, setDetailer] = useState(initialDetailer);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<string>(categories[0]?.id || '');
  const [showMapModal, setShowMapModal] = useState(false);
  const [showVerifiedModal, setShowVerifiedModal] = useState(false);
  const [isReviewModalOpen, setReviewModalOpen] = useState(false);
  const [expandedBundles, setExpandedBundles] = useState<Record<string, boolean>>({});
  const [showContactForm, setShowContactForm] = useState(false);
  const router = useRouter();

  const toggleBundleExpansion = (bundleId: string) => {
    setExpandedBundles(prev => ({ ...prev, [bundleId]: !prev[bundleId] }));
  };

  const handleBookNow = () => {
    router.push(`/book/${detailer.id}/service`);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: detailer.businessName,
        text: `Check out ${detailer.businessName} on Reeva`,
        url: window.location.href,
      }).catch(console.error);
    } else {
      // Fallback for browsers that don't support the Web Share API
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  // Format phone number for display
  const formatPhoneNumber = (phone: string) => {
    const cleaned = ('' + phone).replace(/\D/g, '');
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
                  onClick={() => setShowContactForm(true)}
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

        {/* Tab Content */}
        <div className="mb-12">
          {categories.map(cat => {
            if (cat.id !== activeTab) return null;

            // Render custom or placeholder bundles for the "Bundle" tab
            if (cat.name === 'Bundle') {
              // If detailer has created custom bundles, show them
              if (detailer.bundles && detailer.bundles.length > 0) {
                return (
                  <div key="bundles-section" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {detailer.bundles.map((bundle: Bundle) => {
                      const isExpanded = expandedBundles[bundle.id];
                      const servicesToShow = isExpanded ? bundle.services : bundle.services.slice(0, 3);

                      return (
                        <div key={bundle.id} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden flex flex-col bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow duration-200">
                          {bundle.imageUrl && (
                            <div className="relative w-full h-40">
                              <Image 
                                src={bundle.imageUrl} 
                                alt={bundle.name} 
                                layout="fill" 
                                objectFit="cover" 
                              />
                            </div>
                          )}
                          <div className="p-4 flex-grow flex flex-col">
                            <div className="flex-grow">
                              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{bundle.name}</h3>
                              {bundle.description && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-3">{bundle.description}</p>
                              )}
                              <ul className="space-y-1.5 mt-3">
                                {servicesToShow.map(({ service }) => (
                                  <li key={service.id} className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                                    <svg className="w-4 h-4 mr-2 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                    <span>{service.name}</span>
                                  </li>
                                ))}
                              </ul>
                              {bundle.services.length > 3 && (
                                <button
                                  onClick={() => toggleBundleExpansion(bundle.id)}
                                  className="text-sm text-blue-600 hover:underline mt-3"
                                >
                                  {isExpanded ? 'Show less' : `+ ${bundle.services.length - 3} more`}
                                </button>
                              )}
                            </div>
                            <div className="mt-4 text-right">
                              <span className="text-sm text-gray-500 dark:text-gray-400">Starting at </span>
                              <span className="text-xl font-bold text-teal-600">${bundle.price.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              } 
              // Otherwise, show placeholder "bundle" services
              else {
                const placeholderNames = ["Exterior Detail", "Full Detail", "Interior Detail"];
                const placeholderServices = detailer.services
                  .filter(s => placeholderNames.includes(s.name))
                  .sort((a,b) => placeholderNames.indexOf(a.name) - placeholderNames.indexOf(b.name));

                if (placeholderServices.length === 0) {
                  return (
                    <div key="no-bundles" className="col-span-full text-center py-8 text-gray-500">
                      No bundles available yet.
                    </div>
                  );
                }

                return (
                  <div key="placeholder-bundles" className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {placeholderServices.map((service) => {
                      const isFullDetail = service.name.toLowerCase() === 'full detail';
                      return (
                        <div
                          key={service.id}
                          className={`p-6 rounded-xl flex flex-col items-center text-center border transition-all relative ${isFullDetail ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'}`}
                          style={isFullDetail ? { boxShadow: '0 0 0 2px #22c55e1A' } : {}}
                        >
                          {isFullDetail && (
                            <div className="absolute top-4 left-4 bg-green-900 text-white text-xs font-semibold px-3 py-1 rounded-full shadow" style={{zIndex:2}}>
                              Most Popular
                            </div>
                          )}
                          {service.icon && (
                            <img src={service.icon} alt={service.name + ' icon'} className="w-10 h-10 mb-2 mx-auto" />
                          )}
                          <h3 className="text-xl font-semibold mb-2">{service.name}</h3>
                          <p className="text-gray-400 font-medium">{service.description}</p>
                        </div>
                      );
                    })}
                  </div>
                );
              }
            }
            
            // Render services for other active tabs
            else {
            const services = categorizedServices[activeTab] || [];
            const fullDetailIdx = services.findIndex(s => s.name.toLowerCase() === 'full detail');
            let ordered = services;
            if (fullDetailIdx > 0) {
              ordered = [services[fullDetailIdx], ...services.slice(0, fullDetailIdx), ...services.slice(fullDetailIdx + 1)];
            }

              if (ordered.length === 0) {
                return (
                  <div key={cat.id} className="col-span-full text-center py-8 text-gray-500">
                    No services available in this category.
                  </div>
                );
              }

              return (
                <div key={cat.id} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {ordered.map((service) => {
              const isFullDetail = service.name.toLowerCase() === 'full detail';
              return (
            <div
              key={service.id}
                        className={`p-6 rounded-xl flex flex-col items-center text-center border transition-all relative ${isFullDetail ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'}`}
                  style={isFullDetail ? { boxShadow: '0 0 0 2px #22c55e1A' } : {}}
                >
                  {isFullDetail && (
                    <div className="absolute top-4 left-4 bg-green-900 text-white text-xs font-semibold px-3 py-1 rounded-full shadow" style={{zIndex:2}}>
                      Most Popular
                    </div>
                  )}
              {service.icon && (
                          <img src={service.icon} alt={service.name + ' icon'} className="w-10 h-10 mb-2 mx-auto" />
              )}
              <h3 className="text-xl font-semibold mb-2">{service.name}</h3>
                        <p className="text-gray-400 font-medium">{service.description}</p>
                      </div>
                    );
                  })}
            </div>
              );
            }
          })}
        </div>

        {/* Portfolio Section */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Portfolio</h2>
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

        {/* Reviews Section - moved above map */}
        {detailer.googlePlaceId && (
          <div className="mt-8 bg-white p-6 sm:p-8 rounded-2xl shadow-sm">
            <GoogleReviews placeId={detailer.googlePlaceId} />
          </div>
        )}

        {/* Customer Reviews Section */}
        <div className="mt-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold">Customer Reviews</h2>
                <button 
                    onClick={() => setReviewModalOpen(true)}
                    className="bg-green-600 text-white font-semibold py-2 px-4 rounded-xl hover:bg-green-700 transition"
                >
                    Leave a Review
                </button>
            </div>
            <div className="space-y-6">
                {detailer.reviews && detailer.reviews.length > 0 ? (
                    detailer.reviews.map((review) => (
                        <div key={review.id} className="bg-white p-6 rounded-xl shadow-sm border">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="font-bold text-lg">{review.authorName}</h3>
                                <span className="text-sm text-gray-500">{new Date(review.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div className="mb-3">
                                <StarRating rating={review.rating} />
                            </div>
                            <p className="text-gray-700">{review.comment}</p>
                            {review.reply && (
                                <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                                    <p className="font-semibold text-gray-800">Reply from {detailer.businessName}</p>
                                    <p className="text-gray-600 mt-1">{review.reply}</p>
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <p className="text-gray-500 text-center py-8">Be the first to leave a review!</p>
                )}
            </div>
        </div>

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
          <div className="mt-4 text-gray-700 text-sm">
            The green circle shows an estimated <b>30-mile radius</b> from the detailer's location.
            This is a general estimate of possible serviceable areas. Actual service coverage may vary.
          </div>
          <div className="mt-4 text-gray-500 text-sm flex items-center gap-2">
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

        <LeaveReviewModal
          isOpen={isReviewModalOpen}
          onClose={() => setReviewModalOpen(false)}
          detailerId={detailer.id}
          onReviewSubmitted={(newReview) => {
            // Add the new review to the top of the list to update the UI instantly
            setDetailer(prev => ({ ...prev, reviews: [newReview, ...(prev.reviews || [])] }));
          }}
        />

        {selectedImageIndex !== null && (
          <div className="fixed inset-0 z-50 overflow-hidden bg-black bg-opacity-90 flex items-center justify-center">
            <ImageModal
              imageUrl={portfolioImages[selectedImageIndex].url}
              alt={portfolioImages[selectedImageIndex].alt}
              onClose={() => setSelectedImageIndex(null)}
            />
          </div>
        )}

        {/* Contact Form */}
        {showContactForm && (
          <ContactForm
            detailerName={detailer.businessName}
            detailerId={detailer.id}
            onClose={() => setShowContactForm(false)}
          />
        )}
      </main>
    </>
  );
}