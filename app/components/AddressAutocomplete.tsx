"use client";
import React, { useRef, useEffect, useState } from "react";
import { UseFormSetValue } from 'react-hook-form';
import type { DetailerFormValues } from './DetailerForm';
import { useLoadScript } from '@react-google-maps/api';

const libraries: ["places"] = ["places"];

interface AddressAutocompleteProps {
  address: string;
  setValue: UseFormSetValue<DetailerFormValues>;
  error?: string;
}

export default function AddressAutocomplete({ address, setValue, error }: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  useEffect(() => {
    if (!isLoaded || !inputRef.current) return;

    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ["address"],
      componentRestrictions: { country: "us" },
    });

    autocomplete.setFields([
      "address_components",
      "formatted_address",
      "geometry"
    ]);

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (!place.address_components) return;
      let street = "";
      let city = "";
      let state = "";
      let zip = "";
      place.address_components.forEach((comp: any) => {
        if (comp.types.includes("street_number")) street = comp.long_name + " " + street;
        if (comp.types.includes("route")) street += comp.long_name;
        if (comp.types.includes("locality")) city = comp.long_name;
        if (comp.types.includes("administrative_area_level_1")) state = comp.short_name;
        if (comp.types.includes("postal_code")) zip = comp.long_name;
      });
      setValue("address", street, { shouldValidate: true });
      setValue("city", city, { shouldValidate: true });
      setValue("state", state, { shouldValidate: true });
      setValue("zipCode", zip, { shouldValidate: true });

      // Set latitude and longitude if available
      if (place.geometry && place.geometry.location) {
        setValue("latitude", Number(place.geometry.location.lat().toFixed(5)), { shouldValidate: true });
        setValue("longitude", Number(place.geometry.location.lng().toFixed(5)), { shouldValidate: true });
      }
    });

    return () => {
      google.maps.event.clearInstanceListeners(autocomplete);
    };
  }, [isLoaded, setValue]);

  if (loadError) {
    return <div>Error loading Google Maps</div>;
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="text"
        className="input input-bordered w-full"
        placeholder={isLoaded ? "Start typing address..." : "Loading..."}
        defaultValue={address}
        autoComplete="off"
        name="address"
        disabled={!isLoaded}
      />
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
} 