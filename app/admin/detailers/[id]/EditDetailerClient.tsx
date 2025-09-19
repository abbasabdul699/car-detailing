"use client";
import React, { useState } from "react";
import { useForm } from 'react-hook-form';
import BusinessHoursPicker from "@/app/components/BusinessHoursPicker";
import ServicesSelector from "@/app/components/ServicesSelector";
import ImageUploader from '@/app/components/ImageUploader';
import AddressAutocomplete from "@/app/components/AddressAutocomplete";

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
  firstName?: string;
  lastName?: string;
  password?: string;
  businessHours?: any;
  imageUrl?: string;
  twilioPhoneNumber?: string;
  smsEnabled?: boolean;
  images?: { url: string; alt: string; type?: string }[];
  detailerImages?: { url: string; alt: string; type?: string }[];
  profileImage?: { url: string; alt: string; type?: string };
  portfolioImages?: { id?: string; url: string; alt: string; type?: string }[];
  services?: { service: { id: string; name: string; category?: string } }[];
  instagram?: string;
  tiktok?: string;
  verified?: boolean;
  hidden?: boolean;
}

export default function EditDetailerClient({ detailer: initialDetailer }: { detailer: Detailer }) {
  const { register, setValue, handleSubmit, watch, formState: { errors } } = useForm<Detailer>({
    defaultValues: {
      ...initialDetailer,
      latitude: typeof initialDetailer.latitude === 'string' ? parseFloat(initialDetailer.latitude) : initialDetailer.latitude,
      longitude: typeof initialDetailer.longitude === 'string' ? parseFloat(initialDetailer.longitude) : initialDetailer.longitude,
      verified: initialDetailer.verified ?? false,
      hidden: initialDetailer.hidden ?? false,
    }
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  // For services selector
  const [services, setServices] = useState<string[]>(
    (initialDetailer.services || []).map(ds => ds.service.name)
  );
  // For business hours picker
  const [businessHours, setBusinessHours] = useState<any>(initialDetailer.businessHours || {});

  const handleSave = async (data: Detailer) => {
    setSaving(true);
    setError("");
    setSuccess(false);
    // Format lat/lng to 5 decimals before submit
    const formattedData = {
      ...data,
      latitude: data.latitude ? Number(Number(data.latitude).toFixed(5)) : '',
      longitude: data.longitude ? Number(Number(data.longitude).toFixed(5)) : '',
      services,
      businessHours,
      hidden: data.hidden ?? false,
    };
    try {
      const res = await fetch(`/api/detailers/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formattedData),
      });
      if (res.ok) {
        setSuccess(true);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update detailer");
      }
    } catch (err) {
      setError("Failed to update detailer");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteImage = async (imageUrl: string) => {
    if (!window.confirm('Are you sure you want to delete this image?')) return;
    try {
      const res = await fetch(`/api/images?url=${encodeURIComponent(imageUrl)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setValue('images', ((prev: any[] = []) => prev.filter((img: any) => img.url !== imageUrl))(watch('images')));
        setValue('detailerImages', ((prev: any[] = []) => prev.filter((img: any) => img.url !== imageUrl))(watch('detailerImages')));
      } else {
        alert('Failed to delete image');
      }
    } catch (err) {
      alert('Error deleting image');
    }
  };

  console.log("EditDetailerClient - services state:", services);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <h1 className="text-2xl font-bold mb-6">Edit Detailer</h1>
      <form className="space-y-8 max-w-2xl w-full bg-white p-8 rounded-xl shadow-lg" onSubmit={handleSubmit(handleSave)}>
        {/* Verified & Hide Toggles */}
        <div className="flex items-center mb-4 gap-8">
          {/* Verified Toggle */}
          <div className="flex items-center">
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
          {/* Hide Toggle */}
          <div className="flex items-center">
            <label className="block font-medium mr-4">Hide Profile</label>
            <button
              type="button"
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${watch('hidden') ? 'bg-red-600' : 'bg-gray-300'}`}
              onClick={() => setValue('hidden', !watch('hidden'))}
              aria-pressed={watch('hidden')}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${watch('hidden') ? 'translate-x-6' : 'translate-x-1'}`}
              />
            </button>
            <span className={`ml-3 text-sm font-medium ${watch('hidden') ? 'text-red-700' : 'text-gray-500'}`}>{watch('hidden') ? 'Hidden' : 'Visible'}</span>
          </div>
        </div>
        {/* Business Info */}
        <div className="bg-gray-50 p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Business Info</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium">Business Name</label>
              <input {...register('businessName')} className="input input-bordered w-full" />
              {errors.businessName && <p className="text-red-500 text-sm">{errors.businessName.message}</p>}
            </div>
            <div>
              <label className="block font-medium">Description</label>
              <textarea {...register('description')} className="textarea textarea-bordered w-full" maxLength={300} />
              {errors.description && <p className="text-red-500 text-sm">{errors.description.message}</p>}
            </div>
            <div>
              <label className="block font-medium">Address</label>
              <AddressAutocomplete address={watch('address') || ''} setValue={setValue} error={errors.address?.message} />
              {errors.address && <p className="text-red-500 text-sm">{errors.address.message}</p>}
            </div>
            <div>
              <label className="block font-medium">City</label>
              <input {...register('city')} className="input input-bordered w-full" />
              {errors.city && <p className="text-red-500 text-sm">{errors.city.message}</p>}
            </div>
            <div>
              <label className="block font-medium">State</label>
              <input {...register('state')} className="input input-bordered w-full" />
              {errors.state && <p className="text-red-500 text-sm">{errors.state.message}</p>}
            </div>
            <div>
              <label className="block font-medium">Zip Code</label>
              <input {...register('zipCode')} className="input input-bordered w-full" />
              {errors.zipCode && <p className="text-red-500 text-sm">{errors.zipCode.message}</p>}
            </div>
            <div>
              <label className="block font-medium">Latitude</label>
              <input {...register('latitude')} className="input input-bordered w-full" />
              {errors.latitude && <p className="text-red-500 text-sm">{errors.latitude.message}</p>}
            </div>
            <div>
              <label className="block font-medium">Longitude</label>
              <input {...register('longitude')} className="input input-bordered w-full" />
              {errors.longitude && <p className="text-red-500 text-sm">{errors.longitude.message}</p>}
            </div>
            <div>
              <label className="block font-medium">Price Range</label>
              <input {...register('priceRange')} className="input input-bordered w-full" />
              {errors.priceRange && <p className="text-red-500 text-sm">{errors.priceRange.message}</p>}
            </div>
          </div>
        </div>
        {/* Contact Info */}
        <div className="bg-gray-50 p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Contact Info</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium">First Name</label>
              <input {...register('firstName')} className="input input-bordered w-full" />
              {errors.firstName && <p className="text-red-500 text-sm">{errors.firstName.message}</p>}
            </div>
            <div>
              <label className="block font-medium">Last Name</label>
              <input {...register('lastName')} className="input input-bordered w-full" />
              {errors.lastName && <p className="text-red-500 text-sm">{errors.lastName.message}</p>}
            </div>
            <div>
              <label className="block font-medium">Email</label>
              <input {...register('email')} className="input input-bordered w-full" />
              {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block font-medium">Phone</label>
              <input {...register('phone')} className="input input-bordered w-full" />
              {errors.phone && <p className="text-red-500 text-sm">{errors.phone.message}</p>}
            </div>
            <div className="md:col-span-2">
              <label className="block font-medium">Set New Password (optional)</label>
              <input type="password" {...register('password')} className="input input-bordered w-full" placeholder="Leave blank to keep current password" />
            </div>
            <div>
              <label className="block font-medium">Twilio Phone Number (for SMS)</label>
              <input {...register('twilioPhoneNumber')} className="input input-bordered w-full" placeholder="+1234567890" />
              <p className="text-sm text-gray-600 mt-1">Dedicated Twilio number for this detailer's SMS conversations</p>
              {errors.twilioPhoneNumber && <p className="text-red-500 text-sm">{errors.twilioPhoneNumber.message}</p>}
            </div>
            <div>
              <label className="block font-medium">SMS Enabled</label>
              <div className="flex items-center space-x-2">
                <input type="checkbox" {...register('smsEnabled')} className="checkbox" />
                <span className="text-sm">Enable SMS messaging for this detailer</span>
              </div>
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
            value={businessHours}
            onChange={setBusinessHours}
          />
        </div>
        {/* Services */}
        <div className="bg-gray-50 p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Services</h2>
          <ServicesSelector
            value={services}
            onChange={setServices}
          />
        </div>
        {/* Image Uploaders */}
        <div className="bg-gray-50 p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Images</h2>
          {/* Profile Image */}
          <div>
            <h3 className="text-md font-semibold mb-2">Profile Image</h3>
            <ImageUploader
              businessName={watch('businessName')}
              detailerId={watch('id')}
              type="profile"
              images={initialDetailer.profileImage ? [initialDetailer.profileImage] : []}
              onUpload={(url, type) => {
                window.location.reload();
              }}
              onDelete={handleDeleteImage}
            />
          </div>
          {/* Portfolio Images */}
          <div className="mt-6">
            <h3 className="text-md font-semibold mb-2">Portfolio Images</h3>
            <ImageUploader
              businessName={watch('businessName')}
              detailerId={watch('id')}
              type="portfolio"
              images={initialDetailer.portfolioImages || []}
              onUpload={(url, type) => {
                window.location.reload();
              }}
              onDelete={handleDeleteImage}
            />
          </div>
        </div>
        <button
          type="submit"
          className="w-full flex items-center justify-center px-6 py-3 bg-green-700 text-white font-bold rounded-xl shadow-lg transition-all duration-200 transform hover:bg-green-800 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2"
          disabled={saving}
        >
          {saving ? (
            <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
            </svg>
          ) : null}
          {saving ? "Saving..." : "Save Changes"}
        </button>
        {success && <div className="text-green-600 mt-2">Detailer updated successfully!</div>}
        {error && <div className="text-red-600 mt-2">{error}</div>}
      </form>
    </div>
  );
} 