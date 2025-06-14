'use client';

import React, { useState } from 'react';

interface Profile {
  id: string;
  email: string;
  name?: string;
  lastName?: string;
  photo?: string;
  businessName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  description: string;
  latitude: number;
  longitude: number;
  priceRange: string;
  website?: string;
  imageUrl?: string;
  businessHours: any;
  verified: boolean;
  tiktok?: string;
  instagram?: string;
  facebook?: string;
}

interface ProfileEditFormProps {
  profile: Profile;
  onClose: () => void;
  onSave: (profile: Profile) => void;
  section?: string;
}

const ProfileEditForm: React.FC<ProfileEditFormProps> = ({ profile, onClose, onSave, section }) => {
  const [form, setForm] = useState({
    name: profile.name || '',
    lastName: profile.lastName || '',
    businessName: profile.businessName || '',
    phone: profile.phone || '',
    address: profile.address || '',
    city: profile.city || '',
    state: profile.state || '',
    zipCode: profile.zipCode || '',
    description: profile.description || '',
    priceRange: profile.priceRange || '',
    website: profile.website || '',
    imageUrl: profile.imageUrl || '',
    tiktok: profile.tiktok || '',
    instagram: profile.instagram || '',
    facebook: profile.facebook || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/detailer/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Failed to update profile');
      const updated = await res.json();
      onSave(updated);
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  // Determine which fields to show based on section
  let fields: { label: string; name: keyof typeof form; type?: string; textarea?: boolean; disabled?: boolean }[] = [];
  if (section === 'personal') {
    fields = [
      { label: 'First Name', name: 'name' },
      { label: 'Last Name', name: 'lastName' },
      { label: 'Phone Number', name: 'phone' },
      { label: 'Price Range', name: 'priceRange' },
      { label: 'Description', name: 'description', textarea: true },
    ];
  } else if (section === 'address') {
    fields = [
      { label: 'Address', name: 'address' },
      { label: 'City', name: 'city' },
      { label: 'State', name: 'state' },
      { label: 'Zip Code', name: 'zipCode' },
    ];
  } else if (section === 'profile') {
    fields = [
      { label: 'Business Name', name: 'businessName' },
      { label: 'TikTok Link', name: 'tiktok' },
      { label: 'Instagram Link', name: 'instagram' },
      { label: 'Facebook Link', name: 'facebook' },
      { label: 'Website', name: 'website' },
    ];
  } else {
    fields = [
      { label: 'Name', name: 'name' },
      { label: 'Business Name', name: 'businessName' },
      { label: 'Phone', name: 'phone' },
      { label: 'Address', name: 'address' },
      { label: 'City', name: 'city' },
      { label: 'State', name: 'state' },
      { label: 'Zip Code', name: 'zipCode' },
      { label: 'Description', name: 'description', textarea: true },
      { label: 'Price Range', name: 'priceRange' },
      { label: 'Website', name: 'website' },
    ];
  }

  // Modal title based on section
  let modalTitle = 'Edit Profile';
  if (section === 'personal') modalTitle = 'Edit Personal Information';
  else if (section === 'address') modalTitle = 'Edit Address';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-8 w-full max-w-lg relative">
        <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-700" onClick={onClose}>&times;</button>
        <h2 className="text-xl font-bold mb-4">{modalTitle}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {section === 'personal' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium">Email Address</label>
                <input name="email" value={profile.email} disabled className="w-full border rounded p-2 bg-gray-100 text-gray-500" />
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.map((field) => (
              <div key={field.name} className={field.textarea ? 'md:col-span-2' : ''}>
                <label className="block text-sm font-medium">{field.label}</label>
                {field.textarea ? (
                  <textarea name={field.name} value={form[field.name] as string} onChange={handleChange} className="w-full border rounded p-2" />
                ) : (
                  <input name={field.name} value={form[field.name] as string} onChange={handleChange} className="w-full border rounded p-2" />
                )}
              </div>
            ))}
          </div>
          {error && <div className="text-red-600">{error}</div>}
          <div className="flex justify-end gap-2">
            <button type="button" className="px-4 py-2 rounded bg-gray-200" onClick={onClose}>Cancel</button>
            <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileEditForm; 