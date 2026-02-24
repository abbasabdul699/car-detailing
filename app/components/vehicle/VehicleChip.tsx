'use client';

import React from 'react';
import { getManufacturerForModel, DEFAULT_VEHICLE_CATALOG } from '@/lib/vehicleCatalog';
import ManufacturerLogo from '@/app/components/vehicle/ManufacturerLogo';

interface VehicleChipProps {
  model: string;
  onRemove?: () => void;
  className?: string;
  logoClassName?: string;
}

export default function VehicleChip({ model, onRemove, className = '', logoClassName = 'h-4 w-4 rounded-sm bg-white p-0.5' }: VehicleChipProps) {
  const brand = getManufacturerForModel(model, DEFAULT_VEHICLE_CATALOG);

  return (
    <span className={`inline-flex items-center gap-2 rounded-xl bg-[#f8f8f7] px-2.5 py-1.5 text-sm text-[#2B2B26] ${className}`}>
      <ManufacturerLogo manufacturerName={brand} className={logoClassName} />
      <span>{model}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="h-4 w-4 rounded-full text-[#6b6a5e] hover:bg-[#deded9] flex items-center justify-center"
          aria-label={`Remove ${model}`}
        >
          x
        </button>
      )}
    </span>
  );
}

