'use client';
import React, { createContext, useContext } from 'react';
import { useJsApiLoader, type Library } from '@react-google-maps/api';
import { GOOGLE_MAPS_LIBRARIES } from '@/lib/googleMaps';

const MapLoaderContext = createContext<{ isLoaded: boolean }>({ isLoaded: false });

export function MapLoaderProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: GOOGLE_MAPS_LIBRARIES,
  });
  return (
    <MapLoaderContext.Provider value={{ isLoaded }}>
      {children}
    </MapLoaderContext.Provider>
  );
}

export function useMapLoader() {
  return useContext(MapLoaderContext);
} 