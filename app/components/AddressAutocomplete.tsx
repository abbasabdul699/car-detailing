"use client";
import React, { useRef, useEffect } from "react";
import { UseFormSetValue } from 'react-hook-form';
import type { DetailerFormValues } from './DetailerForm';
import { useMapLoader } from './MapLoaderProvider';

interface AddressAutocompleteProps {
  address: string;
  setValue: UseFormSetValue<any>;
  error?: string;
}

export default function AddressAutocomplete({ address, setValue, error }: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { isLoaded } = useMapLoader();
  const loadError = false;

  useEffect(() => {
    if (!isLoaded || !inputRef.current || !window.google || !window.google.maps || !window.google.maps.places) return;
    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, { types: ["address"] });
    const listener = autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (!place.address_components) return;
      // Helper to get a component by type
      const getComponent = (type: string) =>
        place.address_components?.find((c: any) => c.types.includes(type))?.long_name || "";
      // Extract details
      const city = getComponent("locality");
      const state = getComponent("administrative_area_level_1");
      const zipCode = getComponent("postal_code");
      const lat = place.geometry?.location?.lat();
      const lng = place.geometry?.location?.lng();
      // Set values in the parent form
      setValue("address", place.formatted_address || "");
      setValue("city", city);
      setValue("state", state);
      setValue("zipCode", zipCode);
      setValue("latitude", lat ? lat.toFixed(5) : "");
      setValue("longitude", lng ? lng.toFixed(5) : "");
    });
    return () => {
      if (listener) listener.remove();
    };
  }, [isLoaded, inputRef.current, setValue]);

  if (loadError) {
    return <div>Error loading Google Maps</div>;
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="text"
        className="input input-bordered w-full"
        value={address}
        onChange={e => setValue("address", e.target.value)}
        placeholder={isLoaded ? "Start typing address..." : "Loading..."}
        autoComplete="off"
        name="address"
        disabled={!isLoaded}
      />
      {error && <div className="text-red-500 text-sm mt-1">{error}</div>}
    </div>
  );
} 