import Image from 'next/image';
import { notFound } from 'next/navigation';
import { FaInstagram, FaTiktok, FaGlobe, FaShare } from 'react-icons/fa';
import Navbar from '@/app/components/Navbar';
import LocationMap from './components/LocationMap';
import ImageModal from './components/ImageModal';
import { prisma } from '@/lib/prisma';
import DetailerProfileClient from './components/DetailerProfileClient';

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
  googlePlaceId: string;
  instagram?: string;
  tiktok?: string;
  facebook?: string;
}

// Function to open native maps app
const openMaps = (address: string, city: string, state: string, zipCode: string) => {
  const formattedAddress = `${address}, ${city}, ${state} ${zipCode}`;
  const encodedAddress = encodeURIComponent(formattedAddress);
  
  // Check if device is iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  
  if (isIOS) {
    window.location.href = `maps://?address=${encodedAddress}`;
  } else {
    window.location.href = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
  }
};

export default async function DetailerProfile({ params }: { params: { id: string } }) {
  const { id } = await params;
  
  try {
    const detailer = await prisma.detailer.findUnique({
      where: { id },
      select: {
        id: true,
        businessName: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        description: true,
        priceRange: true,
        services: { include: { service: true } },
        website: true,
        images: true,
        detailerImages: true,
        verified: true,
        googlePlaceId: true,
        instagram: true,
        tiktok: true,
        facebook: true,
      }
    });

    if (!detailer) {
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

    // Combine both image types and ensure they have the correct format
    const combinedImages = [
      ...detailer.images.map(img => ({
        ...img,
        type: (img as any).type || 'portfolio',
      })),
      ...detailer.detailerImages.map(img => ({
        url: img.url,
        alt: img.alt,
        type: 'portfolio', // Default type for legacy images
      }))
    ];

    // Pass the full service objects to the client, ensuring 'category' is present
    const serviceObjs = detailer.services.map(ds => {
      const s = ds.service as any;
      // Always return a service object with a 'category' property as { name: string }
      return {
        ...s,
        category: s.category && typeof s.category === 'object' && 'name' in s.category
          ? s.category
          : { name: s.category || '' }
      };
    });

    console.log('Fetched detailer data:', detailer); // Add debug logging

    return <DetailerProfileClient detailer={{
      ...(detailer as any),
      email: detailer.email || '',
      services: serviceObjs,
      images: combinedImages,
      website: detailer.website || undefined,
      googlePlaceId: detailer.googlePlaceId || undefined,
      facebook: detailer.facebook || undefined,
    }} categories={categories} />;
  } catch (error) {
    console.error('Error fetching detailer:', error);
    return notFound();
  }
}