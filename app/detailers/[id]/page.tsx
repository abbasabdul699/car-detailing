import Image from 'next/image';
import { notFound } from 'next/navigation';
import { FaInstagram, FaTiktok, FaGlobe, FaShare } from 'react-icons/fa';
import Navbar from '@/app/components/Navbar';
import LocationMap from './components/LocationMap';
import ImageModal from './components/ImageModal';
import { prisma } from '@/lib/prisma';
import DetailerProfileClient from './components/DetailerProfileClient';
<<<<<<< Updated upstream

interface DetailerImage {
  url: string;
  alt: string;
  type: string;
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
  detailerImages: DetailerImage[];
  address: string;
  city: string;
  state: string;
  zipCode: string;
  website?: string;
  verified: boolean;
  hidden: boolean;
}
=======
import type { Detailer } from '@prisma/client';
import { unstable_noStore as noStore } from 'next/cache';
>>>>>>> Stashed changes

// Function to open native maps app
const openMaps = (address: string, city: string, state: string, zipCode: string) => {
  const formattedAddress = `${address}, ${city}, ${state} ${zipCode}`;
  const encodedAddress = encodeURIComponent(formattedAddress);
  
  // Check if device is iOS
  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
  
  if (isIOS) {
    window.location.href = `maps://?address=${encodedAddress}`;
  } else {
    window.location.href = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
  }
};

<<<<<<< Updated upstream
export default async function DetailerProfile({ 
  params 
}: { 
  params: { id: string } 
}) {
  const id = params.id;
  
  try {
=======
async function getDetailer(id: string) {
  noStore();
>>>>>>> Stashed changes
    const detailer = await prisma.detailer.findUnique({
      where: { id },
    include: {
      services: {
        include: {
          service: true,
        },
      },
        images: true,
<<<<<<< Updated upstream
        detailerImages: true,
        verified: true,
        hidden: true,
      }
    });

    if (!detailer || detailer.hidden) {
=======
      portfolioImages: true,
      bundles: {
        include: {
          services: {
            include: {
              service: true,
            },
          },
        },
      },
      reviews: {
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
    });

  if (!detailer || detailer.hidden) {
>>>>>>> Stashed changes
      return notFound();
    }

    // Fetch categories from the API
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const categoriesRes = await fetch(`${baseUrl}/api/categories`, { cache: 'no-store' });
    const categories = await categoriesRes.json();

    // Sort categories in the desired order
    const desiredOrder = ['Bundle', 'Exterior', 'Interior', 'Additional'];
    categories.sort((a: { name: string }, b: { name: string }) => {
      const aIdx = desiredOrder.indexOf(a.name);
      const bIdx = desiredOrder.indexOf(b.name);
      if (aIdx === -1 && bIdx === -1) return a.name.localeCompare(b.name);
      if (aIdx === -1) return 1;
      if (bIdx === -1) return -1;
      return aIdx - bIdx;
    });

  // Start with the new portfolio images
  const combinedImages = detailer.portfolioImages.map(img => ({
    id: img.id,
    url: img.url,
    alt: `Portfolio image for ${detailer.businessName}`, // Provide a default alt
    type: 'portfolio',
  }));

  const existingUrls = new Set(combinedImages.map(img => img.url));

  // Add images from the legacy `images` array only if they're not already included
  detailer.images.forEach(img => {
    if (!existingUrls.has(img.url)) {
      combinedImages.push({
        id: img.id,
        url: img.url,
        alt: img.alt || `Legacy portfolio image for ${detailer.businessName}`,
        type: img.type || 'portfolio',
      });
      existingUrls.add(img.url);
    }
  });

    // Pass the full service objects to the client, ensuring 'category' is present
    const serviceObjs = detailer.services.map(ds => {
      const s = ds.service as any;
      return {
        ...s,
        category: s.category && typeof s.category === 'object' && 'name' in s.category
          ? s.category
          : { name: s.category || '' }
      };
    });

    return <DetailerProfileClient detailer={{
<<<<<<< Updated upstream
      ...detailer,
      email: detailer.email || '',
      services: serviceObjs,
      images: combinedImages,
      website: detailer.website || undefined
=======
    ...(detailer as any),
      services: serviceObjs,
      images: combinedImages,
    bundles: detailer.bundles,
    reviews: detailer.reviews,
>>>>>>> Stashed changes
    }} categories={categories} />;
}

export default async function DetailerProfile({ params }: { params: { id: string } }) {
  const awaitedParams = await params;
  const { id } = awaitedParams;
  
  try {
    return await getDetailer(id);
  } catch (error) {
    console.error('Error fetching detailer:', error);
    return notFound();
  }
}