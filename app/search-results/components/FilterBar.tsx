import React from 'react';
import { FunnelIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/outline';

interface FilterBarProps {
  filters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
  services: string[];
  sortOrder?: string;
  onSortChange?: (order: string) => void;
}

export interface FilterOptions {
  priceRange: string[];
  selectedServices: string[];
  maxDistance: number;
  verifiedOnly?: boolean;
}

export default function FilterBar({ filters = { priceRange: [], selectedServices: [], maxDistance: 50, verifiedOnly: false }, onFilterChange, services, sortOrder = 'relevance', onSortChange }: FilterBarProps) {
  const priceRanges = ['$', '$$', '$$$', '$$$$'];

  const handleFilterChange = (newFilters: Partial<FilterOptions>) => {
    const updatedFilters = { ...filters, ...newFilters };
    onFilterChange(updatedFilters);
  };

  return (
    <div className="bg-white shadow-sm rounded-lg p-4 mb-6">
      {/* Sort Dropdown */}
      <div className="mb-4">
        <label htmlFor="sortOrder" className="block text-sm font-medium text-gray-700 mb-1">Sort by</label>
        <select
          id="sortOrder"
          value={sortOrder}
          onChange={e => onSortChange && onSortChange(e.target.value)}
          className="block w-60 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 text-sm"
        >
          <option value="relevance">Relevance</option>
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
        </select>
      </div>
      {/* Price Range */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Price Range</h4>
        <div className="flex gap-2">
          {priceRanges.map((price) => (
            <button
              key={price}
              onClick={() => {
                const newPriceRange = filters.priceRange.includes(price)
                  ? filters.priceRange.filter(p => p !== price)
                  : [...filters.priceRange, price];
                handleFilterChange({ priceRange: newPriceRange });
              }}
              className={`px-3 py-1 rounded-full text-sm ${
                filters.priceRange.includes(price)
                  ? 'bg-teal-100 text-teal-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {price}
            </button>
          ))}
        </div>
      </div>

      {/* Services */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Services</h4>
        <div className="flex flex-wrap gap-2">
          {services.map((service) => (
            <button
              key={service}
              onClick={() => {
                const newServices = filters.selectedServices.includes(service)
                  ? filters.selectedServices.filter(s => s !== service)
                  : [...filters.selectedServices, service];
                handleFilterChange({ selectedServices: newServices });
              }}
              className={`px-3 py-1 rounded-full text-sm ${
                filters.selectedServices.includes(service)
                  ? 'bg-teal-100 text-teal-800'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {service}
            </button>
          ))}
        </div>
      </div>

      {/* Distance */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">Maximum Distance</h4>
        <input
          type="range"
          min="5"
          max="100"
          step="5"
          value={filters.maxDistance}
          onChange={(e) => handleFilterChange({ maxDistance: parseInt(e.target.value) })}
          className="w-full"
        />
        <div className="text-sm text-gray-600 mt-1">
          {filters.maxDistance} miles
        </div>
      </div>

      {/* Verified Only */}
      <div className="mb-4">
        <label className="inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={filters.verifiedOnly}
            onChange={e => handleFilterChange({ verifiedOnly: e.target.checked })}
            className="form-checkbox h-5 w-5 text-teal-600"
          />
          <span className="ml-2 text-sm text-gray-700">Verified Only</span>
        </label>
      </div>

      {filters.verifiedOnly && (
        <div className="absolute top-4 right-4 bg-white rounded-full px-6 py-3 flex items-center shadow-xl z-20">
          <CheckCircleIcon className="h-9 w-9 text-green-500 mr-3" />
          <span className="text-xl font-extrabold text-green-700">Verified</span>
        </div>
      )}
    </div>
  );
} 