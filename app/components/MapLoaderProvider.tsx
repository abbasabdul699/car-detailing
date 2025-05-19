'use client';
import React, { createContext, useContext } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';

const MapLoaderContext = createContext<{ isLoaded: boolean }>({ isLoaded: false });

export function MapLoaderProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: ['places'],
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