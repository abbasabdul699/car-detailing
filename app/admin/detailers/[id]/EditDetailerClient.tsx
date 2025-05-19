"use client";
import React, { useState } from "react";
import BusinessHoursPicker from "@/app/components/BusinessHoursPicker";
import ServicesSelector from "@/app/components/ServicesSelector";
import ImageUploader from '@/app/components/ImageUploader';

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

export default function EditDetailerClient({ detailer: initialDetailer }: { detailer: Detailer }) {
  const [detailer, setDetailer] = useState<Detailer>({
    ...initialDetailer,
    latitude: initialDetailer.latitude?.toString() ?? '',
    longitude: initialDetailer.longitude?.toString() ?? '',
    verified: initialDetailer.verified ?? false,
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setDetailer({ ...detailer, [name]: value });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess(false);
    try {
      const res = await fetch(`/api/detailers/${detailer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...detailer,
          services,
          businessHours,
        }),
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
      const res = await fetch(`/api/detailers/${detailer.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl }),
      });
      if (res.ok) {
        setDetailer(prev => ({
          ...prev,
          images: (prev.images || []).filter(img => img.url !== imageUrl),
          detailerImages: (prev.detailerImages || []).filter(img => img.url !== imageUrl),
        }));
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
      <form className="space-y-8 max-w-2xl w-full bg-white p-8 rounded-xl shadow-lg" onSubmit={handleSave}>
        {/* Verified Toggle */}
        <div className="flex items-center mb-4">
          <label className="block font-medium mr-4">Verified</label>
          <button
            type="button"
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${detailer.verified ? 'bg-green-600' : 'bg-gray-300'}`}
            onClick={() => setDetailer(d => ({ ...d, verified: !d.verified }))}
            aria-pressed={detailer.verified}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${detailer.verified ? 'translate-x-6' : 'translate-x-1'}`}
            />
          </button>
          <span className={`ml-3 text-sm font-medium ${detailer.verified ? 'text-green-700' : 'text-gray-500'}`}>{detailer.verified ? 'Verified' : 'Not Verified'}</span>
        </div>
        {/* Business Info */}
        <div className="bg-gray-50 p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Business Info</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium">Business Name</label>
              <input name="businessName" value={detailer.businessName} onChange={handleChange} className="input input-bordered w-full" />
            </div>
            <div>
              <label className="block font-medium">Description</label>
              <textarea name="description" value={detailer.description} onChange={handleChange} className="textarea textarea-bordered w-full" maxLength={300} />
            </div>
            <div>
              <label className="block font-medium">Address</label>
              <input name="address" value={detailer.address} onChange={handleChange} className="input input-bordered w-full" />
            </div>
            <div>
              <label className="block font-medium">City</label>
              <input name="city" value={detailer.city} onChange={handleChange} className="input input-bordered w-full" />
            </div>
            <div>
              <label className="block font-medium">State</label>
              <input name="state" value={detailer.state} onChange={handleChange} className="input input-bordered w-full" />
            </div>
            <div>
              <label className="block font-medium">Zip Code</label>
              <input name="zipCode" value={detailer.zipCode} onChange={handleChange} className="input input-bordered w-full" />
            </div>
            <div>
              <label className="block font-medium">Latitude</label>
              <input name="latitude" value={detailer.latitude} onChange={handleChange} className="input input-bordered w-full" />
            </div>
            <div>
              <label className="block font-medium">Longitude</label>
              <input name="longitude" value={detailer.longitude} onChange={handleChange} className="input input-bordered w-full" />
            </div>
            <div>
              <label className="block font-medium">Price Range</label>
              <input name="priceRange" value={detailer.priceRange} onChange={handleChange} className="input input-bordered w-full" />
            </div>
          </div>
        </div>
        {/* Contact Info */}
        <div className="bg-gray-50 p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Contact Info</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium">Email</label>
              <input name="email" value={detailer.email} onChange={handleChange} className="input input-bordered w-full" />
            </div>
            <div>
              <label className="block font-medium">Phone</label>
              <input name="phone" value={detailer.phone} onChange={handleChange} className="input input-bordered w-full" />
            </div>
          </div>
        </div>
        {/* Social Links */}
        <div className="bg-gray-50 p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Social Links</h2>
          <div className="space-y-4">
            <div>
              <label className="block font-medium">Website (optional)</label>
              <input name="website" value={detailer.website || ""} onChange={handleChange} className="input input-bordered w-full" placeholder="https://..." />
            </div>
            <div>
              <label className="block font-medium">TikTok (optional)</label>
              <input name="tiktok" value={detailer.tiktok || ""} onChange={handleChange} className="input input-bordered w-full" placeholder="https://tiktok.com/@..." />
            </div>
            <div>
              <label className="block font-medium">Instagram (optional)</label>
              <input name="instagram" value={detailer.instagram || ""} onChange={handleChange} className="input input-bordered w-full" placeholder="https://instagram.com/..." />
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
        {/* Profile Image */}
        <div className="bg-gray-50 p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Profile Image</h2>
          {(() => {
            // Find the profile image (by convention: first image, or with a 'profile' type if available)
            const allImages = [...(detailer.images || []), ...(detailer.detailerImages || [])];
            const profileImage = allImages.find(img => img.type === 'profile') || allImages[0];
            return profileImage ? (
              <div className="relative w-24 h-24 mb-2">
                <img src={profileImage.url} alt={profileImage.alt || 'Profile image'} className="object-cover w-full h-full rounded" />
                <button
                  type="button"
                  className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                  onClick={() => handleDeleteImage(profileImage.url)}
                  title="Delete profile image"
                >
                  &times;
                </button>
              </div>
            ) : (
              <div className="mb-2 text-gray-500">No profile image set.</div>
            );
          })()}
          <ImageUploader
            businessName={detailer.businessName}
            detailerId={detailer.id}
            onUpload={url => {
              // Replace the profile image
              setDetailer(prev => ({
                ...prev,
                images: [{ url, alt: `${prev.businessName} profile image`, type: 'profile' }, ...(prev.images || []).filter(img => img.type !== 'profile')]
              }));
            }}
            type="profile"
          />
        </div>
        {/* Portfolio Images */}
        <div className="bg-gray-50 p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Portfolio Images</h2>
          <div className="flex flex-wrap gap-4 mb-2">
            {[...(detailer.images || []), ...(detailer.detailerImages || [])]
              .filter(img => img.type !== 'profile')
              .map((img, idx) => (
                <div key={idx} className="relative w-24 h-24">
                  <img src={img.url} alt={img.alt || 'Portfolio image'} className="object-cover w-full h-full rounded" />
                  <button
                    type="button"
                    className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                    onClick={() => handleDeleteImage(img.url)}
                    title="Delete portfolio image"
                  >
                    &times;
                  </button>
                </div>
              ))}
          </div>
          <ImageUploader
            businessName={detailer.businessName}
            detailerId={detailer.id}
            onUpload={url => {
              // Add new portfolio image
              setDetailer(prev => ({
                ...prev,
                images: [...(prev.images || []), { url, alt: `${prev.businessName} portfolio image`, type: 'portfolio' }]
              }));
            }}
            type="portfolio"
          />
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