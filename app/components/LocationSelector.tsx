'use client';

import { useJsApiLoader } from '@react-google-maps/api';
import { GOOGLE_MAPS_CONFIG } from '@/lib/googleMaps';

export default function LocationSelector() {
  const { isLoaded } = useJsApiLoader(GOOGLE_MAPS_CONFIG);
  
  // Rest of the component
} 