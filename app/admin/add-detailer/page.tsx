// ImageUploader.tsx: Handles image uploads and previews
// DetailerForm.tsx: Manages the detailer form and image upload sections
// api/upload/route.ts: Handles the image upload API endpoint
// lib/s3-utils.ts: Manages S3 operations

"use client";
import React, { useState } from "react";
import BusinessHoursPicker from "@/app/components/BusinessHoursPicker";
import ServicesSelector from "@/app/components/ServicesSelector";
import ImageUploader from '@/app/components/ImageUploader';
import AddressAutocomplete from "@/app/components/AddressAutocomplete";
import { useForm } from "react-hook-form";
import AdminNavbar from '@/app/components/AdminNavbar';
import { useRouter } from 'next/navigation';
import Modal from '@/app/admin/add-detailer/Modal';


interface Detailer {
  id: string;
  businessName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  description: string;
  latitude: string | number;
  longitude: string | number;
  priceRange: string;
  website: string;
  businessHours?: any;
  imageUrl?: string;
  images?: { url: string; alt: string; type?: string }[];
  detailerImages?: { url: string; alt: string; type?: string }[];
  services?: { service: { id: string; name: string; category?: string } }[];
  instagram?: string;
  tiktok?: string;
  verified?: boolean;
}

// Default empty detailer for "new" case
const EMPTY_DETAILER: Detailer = {
  id: '',
  businessName: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  zipCode: '',
  description: '',
  latitude: '',
  longitude: '',
  priceRange: '',
  website: '',
  businessHours: {},
  imageUrl: '',
  images: [],
  detailerImages: [],
  services: [],
  instagram: '',
  tiktok: '',
  verified: false,
};

export default function AddDetailerPage() {
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [detailerId, setDetailerId] = useState<string | null>(null);
  const {
    register,
    setValue,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<Detailer>({
    defaultValues: EMPTY_DETAILER,
  });
  const [services, setServices] = useState<string[]>([]);
  const [businessHours, setBusinessHours] = useState<any>({});
  const [showImageModal, setShowImageModal] = useState(false);
  const [imagesUploaded, setImagesUploaded] = useState(false);
  const router = useRouter();

  // Sync services and businessHours with form state
  const handleServicesChange = (newServices: string[]) => {
    setServices(newServices);
    setValue('services', newServices);
  };
  const handleBusinessHoursChange = (hours: any) => {
    setBusinessHours(hours);
    setValue('businessHours', hours);
  };

  const handleDeleteImage = async (imageUrl: string) => {
    // Call the new image deletion API
    await fetch(`/api/images?url=${encodeURIComponent(imageUrl)}`, { method: 'DELETE' });

    // Remove from local form state
    const current = watch('images') || [];
    setValue('images', current.filter(img => img.url !== imageUrl));
  };

  const onSubmit = async (data: Detailer) => {
    setError("");
    setSuccess(false);
    // Format lat/lng to 5 decimals before submit
    const formattedData = {
      ...data,
      latitude: data.latitude ? Number(Number(data.latitude).toFixed(5)) : '',
      longitude: data.longitude ? Number(Number(data.longitude).toFixed(5)) : '',
      services,
      businessHours,
    };
    try {
      const res = await fetch(`/api/detailers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formattedData),
      });
      if (res.ok) {
        const result = await res.json();
        console.log('API result:', result);
        setDetailerId(result.detailer?.id);
        setSuccess(true);
        setShowImageModal(true);
      } else {
        const result = await res.json();
        setError(result.error || "Failed to add detailer");
      }
    } catch (err) {
      setError("Failed to add detailer");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <AdminNavbar />
      <h1 className="text-2xl font-bold mb-6">Add New Detailer</h1>
      <form className="space-y-8 max-w-2xl w-full bg-white p-8 rounded-xl shadow-lg" onSubmit={handleSubmit(onSubmit)}>
        {/* Verified Toggle */}
        <div className="flex items-center mb-4">
          <label className="block font-medium mr-4">Verified</label>
          <button
            type="button"
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${watch('verified') ? 'bg-green-600' : 'bg-gray-300'}`}
            onClick={() => setValue('verified', !watch('verified'))}
            aria-pressed={watch('verified')}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${watch('verified') ? 'translate-x-6' : 'translate-x-1'}`}
            />
          </button>
          <span className={`ml-3 text-sm font-medium ${watch('verified') ? 'text-green-700' : 'text-gray-500'}`}>{watch('verified') ? 'Verified' : 'Not Verified'}</span>
        </div>
        {/* Business Info */}
        <div className="bg-gray-50 p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Business Info</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium">Business Name</label>
              <input {...register('businessName')} className="input input-bordered w-full" />
            </div>
            <div>
              <label className="block font-medium">Description</label>
              <textarea {...register('description')} className="textarea textarea-bordered w-full" maxLength={300} />
            </div>
            <div>
              <label className="block font-medium">Address</label>
              <AddressAutocomplete address={watch('address') || ''} setValue={setValue} error={errors.address?.message as string} />
            </div>
            <div>
              <label className="block font-medium">City</label>
              <input {...register('city')} className="input input-bordered w-full" />
            </div>
            <div>
              <label className="block font-medium">State</label>
              <input {...register('state')} className="input input-bordered w-full" />
            </div>
            <div>
              <label className="block font-medium">Zip Code</label>
              <input {...register('zipCode')} className="input input-bordered w-full" />
            </div>
            <div>
              <label className="block font-medium">Latitude</label>
              <input {...register('latitude')} className="input input-bordered w-full" />
            </div>
            <div>
              <label className="block font-medium">Longitude</label>
              <input {...register('longitude')} className="input input-bordered w-full" />
            </div>
            <div>
              <label className="block font-medium">Price Range</label>
              <input {...register('priceRange')} className="input input-bordered w-full" />
            </div>
          </div>
        </div>
        {/* Contact Info */}
        <div className="bg-gray-50 p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Contact Info</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium">Email</label>
              <input {...register('email')} className="input input-bordered w-full" />
            </div>
            <div>
              <label className="block font-medium">Phone</label>
              <input {...register('phone')} className="input input-bordered w-full" />
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
            </div>
            <div>
              <label className="block font-medium">TikTok (optional)</label>
              <input {...register('tiktok')} className="input input-bordered w-full" placeholder="https://tiktok.com/@..." />
            </div>
            <div>
              <label className="block font-medium">Instagram (optional)</label>
              <input {...register('instagram')} className="input input-bordered w-full" placeholder="https://instagram.com/..." />
            </div>
          </div>
        </div>
        {/* Business Hours */}
        <div className="bg-gray-50 p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Business Hours</h2>
          <BusinessHoursPicker value={businessHours} onChange={handleBusinessHoursChange} />
        </div>
        {/* Services */}
        <div className="bg-gray-50 p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Services</h2>
          <ServicesSelector value={services} onChange={handleServicesChange} />
        </div>
        {/* Images */}
        {!detailerId && (
          <div className="mb-4 p-3 bg-yellow-100 text-yellow-800 rounded">
            <strong>Note:</strong> Please submit the form first! Then you can upload profile and portfolio images after the detailer is created.
          </div>
        )}
        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded transition-all duration-200 flex items-center justify-center"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-5 w-5 mr-2 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Saving...
              </>
            ) : (
              <>Save</>
            )}
          </button>
        </div>
        {success && <div className="text-green-600">Detailer saved successfully!</div>}
        {error && <div className="text-red-600">{error}</div>}
      </form>
      {/* Image Upload Modal */}
      {showImageModal && detailerId && (
        <Modal onClose={() => setShowImageModal(false)}>
          <h2 className="text-xl font-bold mb-4">Upload Images</h2>
          <div className="mb-6">
            <h3 className="font-semibold mb-2">Profile Image</h3>
            <ImageUploader
              businessName={watch('businessName')}
              detailerId={detailerId}
              onUpload={url => {
                setValue('images', [
                  { url, alt: `${watch('businessName')} profile image`, type: 'profile' },
                  ...(watch('images') || []).filter(img => img.type !== 'profile')
                ]);
              }}
              type="profile"
              images={watch('images')?.filter(img => img.type === 'profile') || []}
              onDelete={handleDeleteImage}
            />
          </div>
          <div className="mb-6">
            <h3 className="font-semibold mb-2">Portfolio Images</h3>
            <ImageUploader
              businessName={watch('businessName')}
              detailerId={detailerId}
              onUpload={url => {
                const current = watch('images') || [];
                if (!current.some(img => img.url === url)) {
                  setValue('images', [
                    ...current,
                    { url, alt: `${watch('businessName')} portfolio image`, type: 'portfolio' }
                  ]);
                }
              }}
              type="portfolio"
              images={watch('images')?.filter(img => img.type === 'portfolio') || []}
              onDelete={handleDeleteImage}
            />
          </div>
          {!imagesUploaded && (
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded"
              onClick={() => setImagesUploaded(true)}
            >
              Done Uploading Images
            </button>
          )}
          {imagesUploaded && (
            <button
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded mt-4"
              onClick={() => router.push('/admin')}
            >
              Save and Go Home
            </button>
          )}
        </Modal>
      )}
    </div>
  );
} 