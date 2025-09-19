import Image from 'next/image';
import { notFound } from 'next/navigation';
import { FaInstagram, FaTiktok, FaGlobe, FaShare } from 'react-icons/fa';
import Navbar from '@/app/components/Navbar';
import LocationMap from './components/LocationMap';
import ImageModal from './components/ImageModal';
import { prisma } from '@/lib/prisma';
import DetailerProfileClient from './components/DetailerProfileClient';
import type { Detailer } from '@prisma/client';
import { unstable_noStore as noStore } from 'next/cache';

interface DetailerImage {
  url: string;
  alt: string;
  type: string;
}

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

async function getDetailer(id: string) {
  noStore();
  const detailer = await prisma.detailer.findUnique({
    where: { id },
    include: {
      services: {
        include: {
          service: true,
        },
      },
      images: true,
      detailerImages: true,
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

  // Combine images from both sources
  const combinedImages = detailer.images.map(img => ({
    id: img.id,
    url: img.url,
    alt: img.alt || `Image for ${detailer.businessName}`,
    type: img.type || 'portfolio',
  }));

  const existingUrls = new Set(combinedImages.map(img => img.url));

  // Add detailerImages if they're not already included
  detailer.detailerImages.forEach(img => {
    if (!existingUrls.has(img.url)) {
      combinedImages.push({
        id: img.id,
        url: img.url,
        alt: img.alt || `Detailer image for ${detailer.businessName}`,
        type: 'portfolio',
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
    ...(detailer as any),
    services: serviceObjs,
    images: combinedImages,
    bundles: detailer.bundles,
    reviews: detailer.reviews,
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