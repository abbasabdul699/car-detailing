'use client';

import { GoogleMap, Marker, Circle } from '@react-google-maps/api';
import { useMemo, useEffect, useState } from 'react';
import { useMapLoader } from '@/app/components/MapLoaderProvider';

interface LocationMapProps {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  businessName: string;
}

const containerStyle = {
  width: '100%',
  height: '100%'
};

const mapStyles = [
  {"featureType":"all","elementType":"geometry.fill","stylers":[{"visibility":"on"}]},
  {"featureType":"administrative","elementType":"all","stylers":[{"color":"#f2f2f2"}]},
  {"featureType":"administrative","elementType":"labels.text.fill","stylers":[{"color":"#686868"},{"visibility":"on"}]},
  {"featureType":"landscape","elementType":"all","stylers":[{"color":"#f2f2f2"}]},
  {"featureType":"poi","elementType":"all","stylers":[{"visibility":"off"}]},
  {"featureType":"poi.park","elementType":"all","stylers":[{"visibility":"on"}]},
  {"featureType":"poi.park","elementType":"labels.icon","stylers":[{"visibility":"off"}]},
  {"featureType":"road","elementType":"all","stylers":[{"saturation":-100},{"lightness":45}]},
  {"featureType":"road.highway","elementType":"all","stylers":[{"visibility":"simplified"}]},
  {"featureType":"road.highway","elementType":"geometry.fill","stylers":[{"lightness":"-22"},{"visibility":"on"},{"color":"#b4b4b4"}]},
  {"featureType":"road.highway","elementType":"geometry.stroke","stylers":[{"saturation":"-51"},{"lightness":"11"}]},
  {"featureType":"road.highway","elementType":"labels.text","stylers":[{"saturation":"3"},{"lightness":"-56"},{"visibility":"simplified"}]},
  {"featureType":"road.highway","elementType":"labels.text.fill","stylers":[{"lightness":"-52"},{"color":"#9094a0"},{"visibility":"simplified"}]},
  {"featureType":"road.highway","elementType":"labels.text.stroke","stylers":[{"weight":"6.13"}]},
  {"featureType":"road.highway","elementType":"labels.icon","stylers":[{"weight":"1.24"},{"saturation":"-100"},{"lightness":"-10"},{"gamma":"0.94"},{"visibility":"off"}]},
  {"featureType":"road.highway.controlled_access","elementType":"geometry.fill","stylers":[{"visibility":"on"},{"color":"#b4b4b4"},{"weight":"5.40"},{"lightness":"7"}]},
  {"featureType":"road.highway.controlled_access","elementType":"labels.text","stylers":[{"visibility":"simplified"},{"color":"#231f1f"}]},
  {"featureType":"road.highway.controlled_access","elementType":"labels.text.fill","stylers":[{"visibility":"simplified"},{"color":"#595151"}]},
  {"featureType":"road.arterial","elementType":"geometry","stylers":[{"lightness":"-16"}]},
  {"featureType":"road.arterial","elementType":"geometry.fill","stylers":[{"visibility":"on"},{"color":"#d7d7d7"}]},
  {"featureType":"road.arterial","elementType":"labels.text","stylers":[{"color":"#282626"},{"visibility":"simplified"}]},
  {"featureType":"road.arterial","elementType":"labels.text.fill","stylers":[{"saturation":"-41"},{"lightness":"-41"},{"color":"#2a4592"},{"visibility":"simplified"}]},
  {"featureType":"road.arterial","elementType":"labels.text.stroke","stylers":[{"weight":"1.10"},{"color":"#ffffff"}]},
  {"featureType":"road.arterial","elementType":"labels.icon","stylers":[{"visibility":"on"}]},
  {"featureType":"road.local","elementType":"geometry.fill","stylers":[{"lightness":"-16"},{"weight":"0.72"}]},
  {"featureType":"road.local","elementType":"labels.text.fill","stylers":[{"lightness":"-37"},{"color":"#2a4592"}]},
  {"featureType":"transit","elementType":"all","stylers":[{"visibility":"off"}]},
  {"featureType":"transit.line","elementType":"geometry.fill","stylers":[{"visibility":"off"},{"color":"#eeed6a"}]},
  {"featureType":"transit.line","elementType":"geometry.stroke","stylers":[{"visibility":"off"},{"color":"#0a0808"}]},
  {"featureType":"water","elementType":"all","stylers":[{"color":"#b7e4f4"},{"visibility":"on"}]}
];

export default function LocationMap({ address, city, state, zipCode, businessName }: LocationMapProps) {
  const { isLoaded } = useMapLoader();

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [showMapModal, setShowMapModal] = useState(false);

  useEffect(() => {
    async function geocode() {
      const fullAddress = `${address}, ${city}, ${state} ${zipCode}`;
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey) return;
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${apiKey}`;
      try {
        const res = await fetch(url);
        const data = await res.json();
        if (data.status === 'OK' && data.results.length > 0) {
          const location = data.results[0].geometry.location;
          setCoords({ lat: location.lat, lng: location.lng });
    }
      } catch (e) {
        // Fallback: do nothing
      }
    }
    geocode();
  }, [address, city, state, zipCode]);

  // Memoize the marker icon to avoid recreating on every render
  const markerIcon = useMemo(() => {
    if (
      typeof window !== 'undefined' &&
      window.google &&
      window.google.maps &&
      typeof window.google.maps.Size === 'function'
    ) {
      return {
        url: '/images/marker.svg',
        scaledSize: new window.google.maps.Size(40, 40),
      };
    }
    return {
      url: '/images/marker.svg',
    };
  }, [isLoaded]);

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden bg-white border border-gray-200 shadow-lg">
      {isLoaded && coords && (
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={coords}
          zoom={10}
          options={{
            styles: mapStyles,
            fullscreenControl: true,
            zoomControl: true,
            mapTypeControl: false,
            streetViewControl: false,
            clickableIcons: false,
            disableDefaultUI: false,
          }}
        >
          <Marker
            position={coords}
            icon={markerIcon}
          />
          <Circle
            center={coords}
            radius={48280.32}
            options={{
              fillColor: "#22c55e",
              fillOpacity: 0.1,
              strokeColor: "#22c55e",
              strokeOpacity: 0.5,
              strokeWeight: 2,
              clickable: false,
              draggable: false,
              editable: false,
              visible: true,
              zIndex: 1,
            }}
          />
        </GoogleMap>
      )}
    </div>
  );
} 