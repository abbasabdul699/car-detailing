'use client';
import React, { useState } from 'react';
import ProfileEditForm from './components/ProfileEditForm';
import ImageUploader from '../../components/ImageUploader';
import BusinessHoursPicker, { BusinessHours } from "@/app/components/BusinessHoursPicker";

// Define the Profile type matching the API response
interface Profile {
  id: string;
  email: string;
  name?: string;
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
  instagram?: string;
  tiktok?: string;
  facebook?: string;
  profileImage?: string;
}

async function getProfile() {
  const res = await fetch('http://localhost:3000/api/detailer/profile', { cache: 'no-store' });
  return res.json();
}

export default function DetailerProfilePage() {
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [editingSection, setEditingSection] = React.useState<string | null>(null);
  const [showProfileImageModal, setShowProfileImageModal] = React.useState(false);

  React.useEffect(() => {
    getProfile().then((data) => {
      setProfile(data);
      setLoading(false);
    });
  }, []);

  // Handler for profile image upload
  const handleProfileImageUpload = (url: string) => {
    if (profile) {
      setProfile({ ...profile, photo: url });
      setShowProfileImageModal(false);
      // Optionally, PATCH to /api/detailer/profile to update photo in DB
      fetch('/api/detailer/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo: url }),
      });
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!profile) return <div>Profile not found</div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">User Profile</h1>
        {/* My Profile Section */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">My Profile</h2>
            <button className="border border-gray-300 rounded-full px-4 py-1 text-sm flex items-center gap-2 hover:bg-gray-100" onClick={() => setEditingSection('profile')}>✏️ Edit</button>
          </div>
          <div className="flex items-center gap-6">
            <img
              src={profile.profileImage || '/images/default-profile.png'}
              alt="Profile"
              className="w-20 h-20 rounded-full object-cover cursor-pointer border-2 border-gray-300 hover:border-blue-500 transition"
              onClick={() => setShowProfileImageModal(true)}
              title="Change profile image"
            />
            <div className="flex flex-col gap-2">
              <div className="font-bold text-xl text-gray-900 dark:text-gray-100">{profile.name}</div>
              <div className="flex items-center gap-2">
                <input type="text" value={profile.businessName || ''} disabled className="w-full border rounded p-2 bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100 font-semibold text-lg" />
              </div>
              <div className="text-gray-500 dark:text-gray-400 text-sm">{profile.city}, {profile.state}</div>
            </div>
          </div>
        </div>
        {/* Personal Information Section */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Personal Information</h2>
            <button className="border border-gray-300 rounded-full px-4 py-1 text-sm flex items-center gap-2 hover:bg-gray-100" onClick={() => setEditingSection('personal')}>✏️ Edit</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-700 dark:text-gray-200">First Name</label>
              <input type="text" value={profile.name || ''} disabled className="w-full border rounded p-2 bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100" />
            </div>
            <div>
              <label className="block text-xs text-gray-700 dark:text-gray-200">Last Name</label>
              <input type="text" value={profile.businessName || ''} disabled className="w-full border rounded p-2 bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100" />
            </div>
            <div>
              <label className="block text-xs text-gray-700 dark:text-gray-200">Email Address</label>
              <input type="text" value={profile.email || ''} disabled className="w-full border rounded p-2 bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100" />
            </div>
            <div>
              <label className="block text-xs text-gray-700 dark:text-gray-200">Phone Number</label>
              <input type="text" value={profile.phone || ''} disabled className="w-full border rounded p-2 bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-700 dark:text-gray-200">Description</label>
              <textarea value={profile.description || ''} disabled className="w-full border rounded p-2 bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100" />
            </div>
          </div>
        </div>
        {/* Address Section */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Address</h2>
            <button className="border border-gray-300 rounded-full px-4 py-1 text-sm flex items-center gap-2 hover:bg-gray-100" onClick={() => setEditingSection('address')}>✏️ Edit</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-700 dark:text-gray-200">Address</label>
              <input type="text" value={profile.address || ''} disabled className="w-full border rounded p-2 bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100" />
            </div>
            <div>
              <label className="block text-xs text-gray-700 dark:text-gray-200">City</label>
              <input type="text" value={profile.city || ''} disabled className="w-full border rounded p-2 bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100" />
            </div>
            <div>
              <label className="block text-xs text-gray-700 dark:text-gray-200">State</label>
              <input type="text" value={profile.state || ''} disabled className="w-full border rounded p-2 bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100" />
            </div>
            <div>
              <label className="block text-xs text-gray-700 dark:text-gray-200">Postal Code</label>
              <input type="text" value={profile.zipCode || ''} disabled className="w-full border rounded p-2 bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100" />
            </div>
          </div>
        </div>
        {/* Social Media Section */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Social Media</h2>
            <button className="border border-gray-300 rounded-full px-4 py-1 text-sm flex items-center gap-2 hover:bg-gray-100" onClick={() => setEditingSection('social')}>✏️ Edit</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-700 dark:text-gray-200">Facebook</label>
              <input type="text" value={profile.facebook || ''} disabled className="w-full border rounded p-2 bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100" />
            </div>
            <div>
              <label className="block text-xs text-gray-700 dark:text-gray-200">Instagram</label>
              <input type="text" value={profile.instagram || ''} disabled className="w-full border rounded p-2 bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100" />
            </div>
            <div>
              <label className="block text-xs text-gray-700 dark:text-gray-200">TikTok</label>
              <input type="text" value={profile.tiktok || ''} disabled className="w-full border rounded p-2 bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100" />
            </div>
            <div>
              <label className="block text-xs text-gray-700 dark:text-gray-200">Website</label>
              <input type="text" value={profile.website || ''} disabled className="w-full border rounded p-2 bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100" />
            </div>
          </div>
        </div>
        {/* Business Hours Section */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Business Hours</h2>
            <button className="border border-gray-300 rounded-full px-4 py-1 text-sm flex items-center gap-2 hover:bg-gray-100" onClick={() => setEditingSection('businessHours')}>✏️ Edit</button>
          </div>
          <BusinessHoursPicker value={profile.businessHours} onChange={() => {}} />
        </div>
        {/* Edit Modal */}
        {editingSection && (
          <ProfileEditForm profile={profile} onClose={() => setEditingSection(null)} onSave={(updated: Profile) => { setProfile(updated); setEditingSection(null); }} section={editingSection} />
        )}
        {/* Profile Image Modal */}
        {showProfileImageModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-8 w-full max-w-md relative">
              <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-700" onClick={() => setShowProfileImageModal(false)}>&times;</button>
              <h2 className="text-xl font-bold mb-4">Change Profile Image</h2>
              <ImageUploader
                businessName={profile?.businessName || ''}
                detailerId={profile?.id || ''}
                onUpload={handleProfileImageUpload}
                type="profile"
                images={profile?.photo ? [{ url: profile.photo, alt: 'Profile Image', type: 'profile' }] : []}
              />
            </div>
        </div>
        )}
      </div>
    </div>
  );
} 