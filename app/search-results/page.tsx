"use client";

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { GOOGLE_MAPS_CONFIG } from '@/lib/googleMaps';
import DetailerCard from './components/DetailerCard';
import { Suspense } from 'react';
import SearchResults from './components/SearchResults';
import LoadingSpinner from '@/components/LoadingSpinner';

interface SearchResult {
  id: string;
  businessName: string;
  latitude: number;
  longitude: number;
  location: {
    lat: number;
    lng: number;
  };
  priceRange: string;
  googleRating: number;
  totalReviews: number;
  images: {
    url: string;
    alt: string;
  }[];
  services: {
    name: string;
    price: number;
  }[];
  distance: number;
}

export default function SearchResultsPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <SearchResults />
    </Suspense>
  );
} 