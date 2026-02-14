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
  onPlaceSelected?: (address: string) => void;
  onBlur?: () => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onClick?: (e: React.MouseEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
  autoFocus?: boolean;
}

export default function AddressAutocompleteInput({
  value,
  onChange,
  onPlaceSelected,
  onBlur,
  onKeyDown,
  onClick,
  placeholder = "Start typing address...",
  className = "",
  style,
  id,
  autoFocus = false
}: AddressAutocompleteInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const onChangeRef = useRef(onChange);
  const onPlaceSelectedRef = useRef(onPlaceSelected);
  onChangeRef.current = onChange;
  onPlaceSelectedRef.current = onPlaceSelected;

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: GOOGLE_MAPS_LIBRARIES as any,
  });

  // Auto-focus when component mounts if autoFocus is true
  useEffect(() => {
    if (autoFocus && inputRef.current && isLoaded) {
      inputRef.current.focus();
    }
  }, [autoFocus, isLoaded]);

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
        // Update the controlled value first
        onChangeRef.current(place.formatted_address);
        // Then fire the dedicated place-selected callback
        if (onPlaceSelectedRef.current) {
          onPlaceSelectedRef.current(place.formatted_address);
        }
      }
    });

    autocompleteRef.current = autocomplete;

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [isLoaded]); // Stable refs, no need to depend on onChange/onPlaceSelected

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
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      onClick={onClick}
      className={className}
      style={style}
      placeholder={isLoaded ? placeholder : "Loading Google Maps..."}
      autoComplete="off"
      disabled={!isLoaded}
    />
  );
}

