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

export default async function DetailerProfile({ 
  params 
}: { 
  params: { id: string } 
}) {
  const id = params.id;
  
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
      }
    });

    if (!detailer) {
      return notFound();
    }

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

    // Pass the full service objects to the client
    const serviceObjs = detailer.services.map(ds => ds.service);

    console.log('Fetched detailer data:', detailer); // Add debug logging

    return <DetailerProfileClient detailer={{
      ...detailer,
      email: detailer.email || '',
      services: serviceObjs,
      images: combinedImages,
      website: detailer.website || undefined
    }} />;
  } catch (error) {
    console.error('Error fetching detailer:', error);
    return notFound();
  }
}