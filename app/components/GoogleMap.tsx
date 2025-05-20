"use client";

import { useLoadScript, GoogleMap as GoogleMapComponent, MarkerF, type Library } from '@react-google-maps/api';
import { GOOGLE_MAPS_LIBRARIES } from '@/lib/googleMaps';

interface Detailer {
  id: string;
  businessName: string;
  latitude: number;
  longitude: number;
}

interface GoogleMapProps {
  detailers: Detailer[];
  center: {
    lat: number;
    lng: number;
  };
}

const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

export function GoogleMap({ detailers, center }: GoogleMapProps) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  if (loadError) {
    return <div>Error loading maps</div>;
  }

  if (!isLoaded) {
    return <div>Loading maps...</div>;
  }

  return (
    <GoogleMapComponent
      mapContainerStyle={mapContainerStyle}
      zoom={12}
      center={center}
      options={{
        styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }],
        disableDefaultUI: true,
        zoomControl: true,
      }}
    >
      {detailers.map((detailer) => (
        <MarkerF
          key={detailer.id}
          position={{ lat: detailer.latitude, lng: detailer.longitude }}
          title={detailer.businessName}
        />
      ))}
    </GoogleMapComponent>
  );
} 