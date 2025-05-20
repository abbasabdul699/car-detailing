"use client";
import React, { useState } from 'react';
import { useForm, UseFormSetValue } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import ImageUploader from './ImageUploader';
import BusinessHoursPicker, { BusinessHours } from './BusinessHoursPicker';
import ServicesSelector from './ServicesSelector';
import SuccessModal from './SuccessModal';
import AddressAutocomplete from './AddressAutocomplete';

const MAX_DESCRIPTION_WORDS = 30;

const US_STATES = [
  { value: '', label: 'Select a state' },
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
];

const detailerSchema = z.object({
  businessName: z.string().min(2, 'Business name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().min(7, 'Phone is required'),
  address: z.string().min(2, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  zipCode: z.string().min(2, 'Zip code is required'),
  description: z.string()
    .min(2, 'Description is required')
    .refine(val => val.split(/\s+/).filter(Boolean).length <= MAX_DESCRIPTION_WORDS, {
      message: `Description must be ${MAX_DESCRIPTION_WORDS} words or fewer`,
    }),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  priceRange: z.string().min(1, 'Price range is required'),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  imageUrl: z.string().url('Invalid image URL').optional().or(z.literal('')),
  tiktok: z.string().url('Invalid TikTok URL').optional().or(z.literal('')),
  instagram: z.string().url('Invalid Instagram URL').optional().or(z.literal('')),
  businessHours: z.any().optional(),
  services: z.array(z.string()).min(1, 'Select at least one service'),
});

type DetailerFormValues = z.infer<typeof detailerSchema>;
export type { DetailerFormValues };

export default function DetailerForm({ onSuccess }: { onSuccess?: () => void }) {
  const [services, setServices] = useState<string[]>([]);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<DetailerFormValues>({
    resolver: zodResolver(detailerSchema),
    defaultValues: {
      businessName: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      description: '',
      latitude: 0,
      longitude: 0,
      priceRange: '',
      website: '',
      imageUrl: '',
      tiktok: '',
      instagram: '',
      businessHours: {},
      services: [],
    },
  });

  const businessName = watch('businessName');
  const businessHours = watch('businessHours');
  const description = watch('description') || '';
  const descriptionWordCount = description.split(/\s+/).filter(Boolean).length;
  const [showSuccess, setShowSuccess] = useState(false);
  const [detailerId, setDetailerId] = useState<string | null>(null);

  const onSubmit = async (data: DetailerFormValues) => {
    const { imageUrl, ...rest } = data;
    setDetailerId(null);
    setValue('imageUrl', '');

    const res = await fetch('/api/detailers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rest),
    });
    const result = await res.json();
    if (res.ok && result.detailer?.id) {
      setDetailerId(result.detailer.id);
      reset();
      onSuccess?.();
      setShowSuccess(true);
    } else {
      alert('Error: ' + (result.error as string));
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Business Info */}
        <div className="bg-gray-50 p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Business Info</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium">Business Name</label>
              <input {...register('businessName')} className="input input-bordered w-full" placeholder="e.g. Sparkle Detailing" />
              {errors.businessName && <p className="text-red-500 text-sm">{errors.businessName.message}</p>}
            </div>
            <div>
              <label className="block font-medium">Description</label>
              <textarea
                {...register('description')}
                className="textarea textarea-bordered w-full"
                placeholder="Describe the business..."
                maxLength={300}
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>{descriptionWordCount} / {MAX_DESCRIPTION_WORDS} words</span>
              </div>
              {errors.description && <p className="text-red-500 text-sm">{errors.description.message}</p>}
            </div>
            <div>
              <label className="block font-medium">Address</label>
              <AddressAutocomplete
                address={watch('address') || ''}
                setValue={setValue}
                error={errors.address?.message}
              />
              {errors.address && <p className="text-red-500 text-sm">{errors.address.message}</p>}
            </div>
            <div>
              <label className="block font-medium">City</label>
              <input {...register('city')} className="input input-bordered w-full" placeholder="e.g. Boston" />
              {errors.city && <p className="text-red-500 text-sm">{errors.city.message}</p>}
            </div>
            <div>
              <label className="block font-medium">State</label>
              <select {...register('state')} className="input input-bordered w-full">
                {US_STATES.map(state => (
                  <option key={state.value} value={state.value}>{state.label}</option>
                ))}
              </select>
              {errors.state && <p className="text-red-500 text-sm">{errors.state.message}</p>}
            </div>
            <div>
              <label className="block font-medium">Zip Code</label>
              <input {...register('zipCode')} className="input input-bordered w-full" placeholder="e.g. 02118" />
              {errors.zipCode && <p className="text-red-500 text-sm">{errors.zipCode.message}</p>}
            </div>
            <div>
              <label className="block font-medium">Latitude</label>
              <input type="number" step="any" {...register('latitude')} className="input input-bordered w-full" placeholder="e.g. 42.3601" />
              {errors.latitude && <p className="text-red-500 text-sm">{errors.latitude.message}</p>}
            </div>
            <div>
              <label className="block font-medium">Longitude</label>
              <input type="number" step="any" {...register('longitude')} className="input input-bordered w-full" placeholder="e.g. -71.0589" />
              {errors.longitude && <p className="text-red-500 text-sm">{errors.longitude.message}</p>}
            </div>
            <div>
              <label className="block font-medium">Price Range</label>
              <input {...register('priceRange')} className="input input-bordered w-full" placeholder="e.g. $$" />
              {errors.priceRange && <p className="text-red-500 text-sm">{errors.priceRange.message}</p>}
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-gray-50 p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Contact Info</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium">Email</label>
              <input {...register('email')} className="input input-bordered w-full" placeholder="e.g. info@business.com" />
              {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block font-medium">Phone</label>
              <input {...register('phone')} className="input input-bordered w-full" placeholder="e.g. (555) 123-4567" />
              {errors.phone && <p className="text-red-500 text-sm">{errors.phone.message}</p>}
            </div>
          </div>
        </div>

        {/* Social Links */}
        <div className="bg-gray-50 p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Social Links</h2>
          <div className="space-y-4">
            <div>
              <label className="block font-medium">Website (optional)</label>
              <input {...register('website')} className="input input-bordered w-full" placeholder="https://..." />
              {errors.website && <p className="text-red-500 text-sm">{errors.website.message}</p>}
            </div>
            <div>
              <label className="block font-medium">TikTok (optional)</label>
              <input {...register('tiktok')} className="input input-bordered w-full" placeholder="https://tiktok.com/@..." />
              {errors.tiktok && <p className="text-red-500 text-sm">{errors.tiktok.message}</p>}
            </div>
            <div>
              <label className="block font-medium">Instagram (optional)</label>
              <input {...register('instagram')} className="input input-bordered w-full" placeholder="https://instagram.com/..." />
              {errors.instagram && <p className="text-red-500 text-sm">{errors.instagram.message}</p>}
            </div>
          </div>
        </div>

        {/* Business Hours */}
        <div className="bg-gray-50 p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Business Hours</h2>
          <BusinessHoursPicker
            value={businessHours as BusinessHours}
            onChange={hours => setValue('businessHours', hours, { shouldValidate: true })}
          />
          {errors.businessHours && <p className="text-red-500 text-sm">{errors.businessHours.message as string}</p>}
        </div>

        {/* Services */}
        <div className="bg-gray-50 p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Services</h2>
          <ServicesSelector
            value={services}
            onChange={newServices => {
              setServices(newServices);
              setValue('services', newServices, { shouldValidate: true });
            }}
            error={errors.services?.message as string}
          />
        </div>

        <button
          type="submit"
          className="w-full flex items-center justify-center px-6 py-3 bg-green-700 text-white font-bold rounded-xl shadow-lg transition-all duration-200 transform hover:bg-green-800 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
            </svg>
          ) : null}
          {isSubmitting ? 'Submitting...' : 'Add Detailer'}
        </button>
      </form>

      {detailerId && (
        <div className="space-y-6 mt-8">
          <div>
            <h3 className="font-semibold mb-2">Profile Image</h3>
            <ImageUploader
              businessName={businessName}
              detailerId={detailerId}
              onUpload={url => {
                // Optionally update the detailer with the image URL, or just show a success message
              }}
              type="profile"
            />
          </div>
          <div>
            <h3 className="font-semibold mb-2">Portfolio Images</h3>
            <ImageUploader
              businessName={businessName}
              detailerId={detailerId}
              onUpload={url => {
                // Optionally update the detailer with the image URL, or just show a success message
              }}
              type="portfolio"
            />
          </div>
        </div>
      )}

      <SuccessModal
        isOpen={showSuccess}
        onClose={() => setShowSuccess(false)}
      />
    </>
  );
} 