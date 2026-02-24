"use client";
import React, { useState, useRef, useEffect } from 'react';
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/solid';
import { useSession } from 'next-auth/react';
import { useLoadScript } from '@react-google-maps/api';
import { GOOGLE_MAPS_LIBRARIES } from '@/lib/googleMaps';

declare global {
  interface Window {
    google: typeof google;
  }
}

type NewCustomerModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (customer: { customerName: string; customerPhone: string; customerEmail?: string; address?: string; customerType?: string }) => void;
    initialName?: string;
    existingCustomer?: { customerName: string; customerPhone: string; customerAddress?: string; customerType?: string };
    isEditMode?: boolean;
};

// US States list
const US_STATES = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
    'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
    'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
    'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
    'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
    'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
    'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
];

// Format phone number as (XXX) XXX-XXXX
const formatPhoneNumber = (value: string): string => {
    let digits = value.replace(/\D/g, '');
    
    // Strip leading country code "1" if 11 digits
    if (digits.length === 11 && digits.startsWith('1')) {
        digits = digits.slice(1);
    }
    
    const limitedDigits = digits.slice(0, 10);
    
    if (limitedDigits.length === 0) return '';
    if (limitedDigits.length <= 3) return `(${limitedDigits}`;
    if (limitedDigits.length <= 6) return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3)}`;
    return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3, 6)}-${limitedDigits.slice(6)}`;
};

// Parse a full address string into street, city, state, zip components
const parseAddressComponents = (fullAddress: string): { street: string; city: string; state: string; zip: string } => {
    const result = { street: '', city: '', state: '', zip: '' };
    if (!fullAddress) return result;

    const parts = fullAddress.split(',').map(p => p.trim());
    // Typical format: "65 Dyer St, Brockton, MA 02302, USA"
    if (parts.length >= 3) {
        result.street = parts[0];
        result.city = parts[1];
        // The state+zip part might be "MA 02302"
        const stateZip = parts[2].trim();
        const stateZipMatch = stateZip.match(/^([A-Za-z\s]+?)\s+(\d{5}(?:-\d{4})?)$/);
        if (stateZipMatch) {
            const abbr = stateZipMatch[1].trim();
            result.zip = stateZipMatch[2];
            const stateAbbrMap: { [key: string]: string } = {
                'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
                'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
                'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
                'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
                'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
                'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
                'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
                'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
                'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
                'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
                'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
                'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
                'WI': 'Wisconsin', 'WY': 'Wyoming'
            };
            result.state = stateAbbrMap[abbr.toUpperCase()] || US_STATES.find(s => s.toLowerCase() === abbr.toLowerCase()) || '';
        } else {
            result.state = US_STATES.find(s => s.toLowerCase() === stateZip.toLowerCase()) || '';
        }
    } else if (parts.length === 1) {
        result.street = parts[0];
    }
    return result;
};

export default function NewCustomerModal({ isOpen, onClose, onSuccess, initialName = '', existingCustomer, isEditMode = false }: NewCustomerModalProps) {
    const { data: session } = useSession();
    const [customerName, setCustomerName] = useState(initialName || existingCustomer?.customerName || '');
    const [phoneNumber, setPhoneNumber] = useState(existingCustomer?.customerPhone || '');
    const [address, setAddress] = useState(existingCustomer?.customerAddress || '');
    const [customerType, setCustomerType] = useState(existingCustomer?.customerType || '');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [zipCode, setZipCode] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const addressInputRef = useRef<HTMLInputElement>(null);
    const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
    
    const { isLoaded } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
        libraries: GOOGLE_MAPS_LIBRARIES as any,
    });

    // Handle address change and parse components
    const handleAddressChange = (value: string) => {
        setAddress(value);
    };
    
    // Initialize Google Places Autocomplete for address field with enhanced parsing
    useEffect(() => {
        if (!isLoaded || !window.google || !addressInputRef.current || !isOpen) return;

        const options = {
            componentRestrictions: { country: "us" },
            fields: ["formatted_address", "address_components", "geometry"],
            types: ["address"],
        };

        const autocomplete = new window.google.maps.places.Autocomplete(
            addressInputRef.current,
            options
        );

        autocomplete.addListener("place_changed", () => {
            const place = autocomplete.getPlace();
            
            if (place.address_components) {
                const getComponent = (type: string, useShort = false) => {
                    const component = place.address_components.find(
                        (c: any) => c.types.includes(type)
                    );
                    return component ? (useShort ? component.short_name : component.long_name) : '';
                };
                
                // Build street address from components (number + route)
                const streetNumber = getComponent('street_number');
                const route = getComponent('route');
                const streetAddress = [streetNumber, route].filter(Boolean).join(' ');
                setAddress(streetAddress || place.formatted_address || '');
                
                const cityName = getComponent('locality') || getComponent('sublocality');
                if (cityName) setCity(cityName);
                
                const stateFullName = getComponent('administrative_area_level_1');
                if (stateFullName) {
                    const matchedState = US_STATES.find(
                        s => s.toLowerCase() === stateFullName.toLowerCase()
                    );
                    if (matchedState) setState(matchedState);
                }
                
                const zip = getComponent('postal_code');
                if (zip) setZipCode(zip);
            } else if (place.formatted_address) {
                setAddress(place.formatted_address);
            }
        });

        autocompleteRef.current = autocomplete;

        return () => {
            if (autocompleteRef.current) {
                google.maps.event.clearInstanceListeners(autocompleteRef.current);
            }
        };
    }, [isLoaded, isOpen]);

    // Reset form when modal opens/closes
    React.useEffect(() => {
        if (isOpen) {
            if (isEditMode && existingCustomer) {
                setCustomerName(existingCustomer.customerName || '');
                const existingPhone = existingCustomer.customerPhone || '';
                setPhoneNumber(existingPhone ? formatPhoneNumber(existingPhone) : '');
                setCustomerType(existingCustomer.customerType || '');
                // Parse existing address into components
                const parsed = parseAddressComponents(existingCustomer.customerAddress || '');
                setAddress(parsed.street || existingCustomer.customerAddress || '');
                setCity(parsed.city);
                setState(parsed.state);
                setZipCode(parsed.zip);
            } else {
                setCustomerName(initialName);
                setPhoneNumber('');
                setAddress('');
                setCustomerType('');
                setCity('');
                setState('');
                setZipCode('');
            }
            setError('');
        }
    }, [isOpen, initialName]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!customerName.trim()) {
            setError('Customer name is required');
            return;
        }

        if (!phoneNumber.trim()) {
            setError('Phone number is required');
            return;
        }

        // Extract digits only from formatted phone number
        const phoneDigits = phoneNumber.replace(/\D/g, '');
        if (phoneDigits.length !== 10) {
            setError('Phone number must be 10 digits');
            return;
        }

        setIsSubmitting(true);

        try {
            // Combine address components, avoiding duplicates
            const parts = [address];
            if (city && !address.toLowerCase().includes(city.toLowerCase())) parts.push(city);
            if (state) {
                const stateAbbr = Object.entries({
                    'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR',
                    'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE',
                    'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI', 'Idaho': 'ID',
                    'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS',
                    'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
                    'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS',
                    'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV',
                    'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
                    'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK',
                    'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
                    'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT',
                    'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV',
                    'Wisconsin': 'WI', 'Wyoming': 'WY'
                }).find(([name]) => name === state)?.[1] || state;
                if (!address.includes(stateAbbr) && !address.toLowerCase().includes(state.toLowerCase())) {
                    parts.push(state);
                }
            }
            if (zipCode && !address.includes(zipCode)) parts.push(zipCode);
            const fullAddress = parts.filter(Boolean).join(', ');

            const response = await fetch('/api/detailer/customers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    customerPhone: phoneDigits,
                    customerName: customerName.trim(),
                    customerEmail: undefined, // Can be added later if needed
                    address: fullAddress || undefined,
                    locationType: undefined,
                    customerType: customerType || undefined,
                    vehicleModel: undefined,
                    services: [],
                    vcardSent: false,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create customer');
            }

            const data = await response.json();
            
            // Call onSuccess with the created customer data
            onSuccess({
                customerName: customerName.trim(),
                customerPhone: phoneDigits,
                customerEmail: undefined,
                address: fullAddress || undefined,
                customerType: customerType || undefined,
            });

            // Close modal
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to create customer. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 flex items-center justify-center z-50 p-4" 
            style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
            onClick={onClose}
        >
            <div 
                className="rounded-xl shadow-xl" 
                style={{ backgroundColor: '#F8F8F7', width: '500px' }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">
                        {isEditMode ? 'Edit customer' : 'New customer'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full hover:bg-gray-100"
                    >
                        <XMarkIcon className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}

                    {/* Customer name */}
                    <div>
                        <label htmlFor="customer-name" className="block text-sm font-medium text-gray-700 mb-2">
                            Customer name
                        </label>
                        <input
                            type="text"
                            id="customer-name"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                            placeholder="Select customer"
                            required
                        />
                    </div>

                    {/* Phone number */}
                    <div>
                        <label htmlFor="phone-number" className="block text-sm font-medium text-gray-700 mb-2">
                            Phone number
                        </label>
                        <input
                            type="tel"
                            id="phone-number"
                            value={phoneNumber}
                            onChange={(e) => {
                                const formatted = formatPhoneNumber(e.target.value);
                                setPhoneNumber(formatted);
                            }}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                            placeholder="(---) --- ----"
                            maxLength={16}
                            required
                        />
                    </div>

                    {/* Address */}
                    <div>
                        <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                            Address
                        </label>
                        <input
                            ref={addressInputRef}
                            type="text"
                            id="address"
                            value={address}
                            onChange={(e) => handleAddressChange(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                            placeholder={isLoaded ? "123 Main St" : "Loading Google Maps..."}
                            autoComplete="off"
                            disabled={!isLoaded}
                        />
                    </div>

                    {/* City & State */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                                City
                            </label>
                            <input
                                type="text"
                                id="city"
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                                placeholder="City"
                            />
                        </div>
                        <div>
                            <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-2">
                                State
                            </label>
                            <select
                                id="state"
                                value={state}
                                onChange={(e) => setState(e.target.value)}
                                className="w-full px-2 py-2.5 border border-gray-300 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                            >
                                <option value="">Select state</option>
                                {US_STATES.map((stateName) => (
                                    <option key={stateName} value={stateName}>
                                        {stateName}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* ZIP code */}
                    <div>
                        <label htmlFor="zip-code" className="block text-sm font-medium text-gray-700 mb-2">
                            ZIP code
                        </label>
                        <input
                            type="text"
                            id="zip-code"
                            value={zipCode}
                            onChange={(e) => setZipCode(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                            placeholder="02138"
                        />
                    </div>

                    {/* Customer Status Override */}
                    <div>
                        <label htmlFor="customer-status" className="block text-sm font-medium text-gray-700 mb-2">
                            Customer status
                        </label>
                        <select
                            id="customer-status"
                            value={customerType}
                            onChange={(e) => setCustomerType(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                        >
                            <option value="new">New</option>
                            <option value="returning">Repeat</option>
                            <option value="maintenance">Maintenance</option>
                        </select>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-6 py-2 bg-orange-500 text-white rounded-xl hover:bg-orange-600 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isSubmitting}
                        >
                            <CheckIcon className="w-5 h-5" />
                            <span>{isEditMode ? 'Confirm edit' : 'Add new customer'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
