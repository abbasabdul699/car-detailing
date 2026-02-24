'use client';

import React, { useMemo, useState } from 'react';
import { DEFAULT_VEHICLE_CATALOG, getVehicleBrandMap } from '@/lib/vehicleCatalog';
import ManufacturerLogo from '@/app/components/vehicle/ManufacturerLogo';

interface VehiclePickerPopoverProps {
  onSelect: (model: string) => void;
  buttonLabel?: string;
  className?: string;
}

export default function VehiclePickerPopover({
  onSelect,
  buttonLabel = 'Add',
  className = '',
}: VehiclePickerPopoverProps) {
  const brandMap = useMemo(() => getVehicleBrandMap(DEFAULT_VEHICLE_CATALOG), []);
  const [open, setOpen] = useState(false);
  const [hoveredBrand, setHoveredBrand] = useState<string | null>(null);

  const brands = Object.keys(brandMap).sort((a, b) => a.localeCompare(b));

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="px-3 py-1.5 rounded-xl text-sm bg-[#F8F8F7] text-[#6b6a5e] hover:bg-[#F0F0EE] transition-colors"
      >
        {buttonLabel}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 bg-white border border-[#deded9] rounded-lg shadow-lg z-50" style={{ width: hoveredBrand ? 340 : 190 }}>
          <div className="p-2 border-b border-[#F0F0EE]">
            <p className="text-xs text-[#9e9d92]">Select manufacturer</p>
          </div>
          <div className="flex">
            <div className="w-48 max-h-64 overflow-y-auto border-r border-[#F0F0EE]">
              {brands.map((brand) => (
                <button
                  key={brand}
                  type="button"
                  onMouseEnter={() => setHoveredBrand(brand)}
                  className={`w-full px-3 py-2 text-left text-sm transition-colors flex items-center justify-between ${
                    hoveredBrand === brand ? 'bg-[#f8f8f7]' : 'hover:bg-[#f8f8f7]'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <ManufacturerLogo manufacturerName={brand} className="h-4 w-4" alt={brand} />
                    <span>{brand}</span>
                  </span>
                  <span className="text-[#9e9d92]">{'>'}</span>
                </button>
              ))}
            </div>
            {hoveredBrand && (
              <div className="w-[150px] max-h-64 overflow-y-auto">
                {brandMap[hoveredBrand].map((model) => (
                  <button
                    key={model}
                    type="button"
                    onClick={() => {
                      onSelect(model);
                      setOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-[#f8f8f7] transition-colors"
                  >
                    {model}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

