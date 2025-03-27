'use client';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import Image from 'next/image';

interface ProfileData {
  businessName: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phoneNumber: string;
  profileImage: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  description?: string;
  instagram: string;
  tiktok: string;
  website: string;
}

const defaultProfileData: ProfileData = {
  businessName: '',
  firstName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
  profileImage: '',
  address: '',
  city: '',
  state: '',
  zipCode: '',
  description: '',
  instagram: '',
  tiktok: '',
  website: '',
};

export default function ProfileSection() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveStatus, setSaveStatus] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ProfileData>();

  // Fetch profile data when component mounts
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch('/api/detailers/profile');
        if (!response.ok) throw new Error('Failed to fetch profile');
        const data = await response.json();
        
        // Set profile image state
        setProfileImage(data.profileImage || '');
        
        // Set form values with fetched data
        Object.entries(data).forEach(([key, value]) => {
          if (value) setValue(key as keyof ProfileData, value);
        });
        
        setIsLoading(false);
      } catch (err) {
        console.error('Fetch error:', err);
        setError('Failed to load profile');
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [setValue]);

  const onSubmit = async (data: ProfileData) => {
    try {
      setSaveStatus('Saving...');
      const response = await fetch('/api/detailers/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          // Remove 'https://' from website if present
          website: data.website?.replace(/^https?:\/\//, '')
        })
      });

      if (!response.ok) throw new Error('Failed to update profile');
      
      setSaveStatus('Changes saved successfully!');
      setTimeout(() => setSaveStatus(''), 3000); // Clear message after 3 seconds
    } catch (err) {
      console.error('Update error:', err);
      setSaveStatus('Failed to save changes');
    }
  };

  const handleProfileImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) return;

    try {
      const formData = new FormData();
      formData.append('image', event.target.files[0]);

      const response = await fetch('/api/detailers/profile/image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to upload profile image');
      
      const data = await response.json();
      setProfileImage(data.profileImage);
      setValue('profileImage', data.profileImage);
      setSaveStatus('Profile photo updated successfully!');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (err) {
      console.error('Profile image upload error:', err);
      setError('Failed to upload profile image');
    }
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-6">
        <div className="relative h-24 w-24">
          <Image
            src={profileImage || '/default-profile.png'}
            alt="Profile"
            fill
            className="rounded-full object-cover"
          />
        </div>
        <div className="space-y-2">
          <label className="cursor-pointer bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 inline-block">
            Upload Photo
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleProfileImageUpload}
            />
          </label>
          {saveStatus && (
            <p className="text-green-600 text-sm">{saveStatus}</p>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-500 p-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Profile Information</h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Business Name
              </label>
              <input
                type="text"
                {...register('businessName')}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                First Name
              </label>
              <input
                type="text"
                {...register('firstName')}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Last Name
              </label>
              <input
                type="text"
                {...register('lastName')}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <input
                type="tel"
                {...register('phoneNumber')}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Business Address
              </label>
              <input
                type="text"
                {...register('address')}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                City
              </label>
              <input
                type="text"
                {...register('city')}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                State
              </label>
              <input
                type="text"
                {...register('state')}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                ZIP Code
              </label>
              <input
                type="text"
                {...register('zipCode')}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Business Description
              </label>
              <textarea
                {...register('description')}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              />
            </div>

            {/* Social Media Section */}
            <div className="md:col-span-2 mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Social Media & Contact Links
              </h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Instagram
              </label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                  instagram.com/
                </span>
                <input
                  type="text"
                  {...register('instagram')}
                  className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border border-gray-300 focus:ring-green-500 focus:border-green-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                TikTok
              </label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                  tiktok.com/@
                </span>
                <input
                  type="text"
                  {...register('tiktok')}
                  className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border border-gray-300 focus:ring-green-500 focus:border-green-500"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Business Website
              </label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                  https://
                </span>
                <input
                  type="text"
                  {...register('website')}
                  placeholder="www.example.com"
                  className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border border-gray-300 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Enter your full website URL without the 'https://'
              </p>
            </div>

            {/* Contact Email (read-only since it's the login email) */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Contact Email
              </label>
              <input
                type="email"
                {...register('email')}
                disabled
                className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2"
              />
              <p className="mt-1 text-sm text-gray-500">
                This is your login email and will be used for account communications
              </p>
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}
          
          {saveStatus && (
            <div className={`text-sm ${saveStatus.includes('Failed') ? 'text-red-500' : 'text-green-500'}`}>
              {saveStatus}
            </div>
          )}

          <div className="mt-6 flex justify-end space-x-4">
            <button
              type="submit"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 