"use client";
import React, { useRef, useEffect } from 'react';
import { useLoadScript } from '@react-google-maps/api';
import { GOOGLE_MAPS_LIBRARIES } from '@/lib/googleMaps';

declare global {
  interface Window {
    google: typeof google;
  }
}

interface AddressAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

export default function AddressAutocompleteInput({
  value,
  onChange,
  placeholder = "Start typing address...",
  className = "",
  id
}: AddressAutocompleteInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: GOOGLE_MAPS_LIBRARIES as any,
  });

  useEffect(() => {
    if (!isLoaded || !window.google || !inputRef.current) return;

    const options = {
      componentRestrictions: { country: "us" },
      fields: ["formatted_address", "address_components", "geometry"],
      types: ["address"],
    };

    const autocomplete = new window.google.maps.places.Autocomplete(
      inputRef.current,
      options
    );

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      
      if (place.formatted_address) {
        onChange(place.formatted_address);
      }
    });

    autocompleteRef.current = autocomplete;

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [isLoaded, onChange]);

  if (loadError) {
    return (
      <input
        type="text"
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={className}
        placeholder="Address (autocomplete unavailable)"
        disabled
      />
    );
  }

  return (
    <input
      ref={inputRef}
      type="text"
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className}
      placeholder={isLoaded ? placeholder : "Loading Google Maps..."}
      autoComplete="off"
      disabled={!isLoaded}
    />
  );
}

