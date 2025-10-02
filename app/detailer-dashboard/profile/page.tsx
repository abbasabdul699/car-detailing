'use client';
import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import ProfileEditForm from './components/ProfileEditForm';
import ImageUploader from '../../components/ImageUploader';
import BusinessHoursPicker, { BusinessHours } from "@/app/components/BusinessHoursPicker";
import zxcvbn from 'zxcvbn';

// Define the Profile type matching the API response
interface Profile {
  id: string;
  email: string;
  firstName?: string;
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
  instagram?: string;
  tiktok?: string;
  facebook?: string;
  profileImage?: string;
  googleCalendarConnected?: boolean;
  syncAppointments?: boolean;
  syncAvailability?: boolean;
  instagramConnected?: boolean;
  instagramDmEnabled?: boolean;
}

async function getProfile() {
  const res = await fetch('/api/detailer/profile', { cache: 'no-store' });
  
  if (!res.ok) {
    const errorData = await res.text();
    console.error('Profile API error:', res.status, errorData);
    throw new Error(`Failed to fetch profile: ${res.status} ${errorData}`);
  }
  
  const contentType = res.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const text = await res.text();
    console.error('Non-JSON response:', text);
    throw new Error('Invalid response format from profile API');
  }
  
  return res.json();
}

export default function DetailerProfilePage() {
  const { data: session, update: updateSession } = useSession();
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [editingSection, setEditingSection] = React.useState<string | null>(null);
  const [showProfileImageModal, setShowProfileImageModal] = React.useState(false);

  // Settings state
  const [newEmail, setNewEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState('');
  const [emailError, setEmailError] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  React.useEffect(() => {
    getProfile()
      .then((data) => {
        setProfile(data);
        setLoading(false);
        setError(null);
      })
      .catch((err) => {
        console.error('Failed to load profile:', err);
        setError(err.message || 'Failed to load profile');
        setLoading(false);
      });
  }, []);

  // Handler for profile image upload
  const handleProfileImageUpload = async (url: string) => {
    if (profile) {
      // Optimistically update the local state
      setProfile({ ...profile, imageUrl: url });
      setShowProfileImageModal(false);
      
      // The /api/upload route already handles updating the detailer's imageUrl.
      // We just need to trigger a session update to refresh the navbar.
      await updateSession();
    }
  };

  // Google Calendar Integration Handlers
  const handleConnectGoogleCalendar = async () => {
    try {
      // Check if we're logged in first
      const sessionResponse = await fetch('/api/auth/session');
      const session = await sessionResponse.json();
      
      if (!session || !session.user || !session.user.id) {
        console.error('No valid session found');
        alert('Please log in again to connect Google Calendar.');
        window.location.href = '/detailer-login';
        return;
      }
      
      console.log('Session found:', session.user);
      
      // Redirect to Google OAuth
      const response = await fetch('/api/detailer/calendar/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const { authUrl } = await response.json();
        console.log('Redirecting to:', authUrl);
        window.location.href = authUrl;
      } else {
        const errorData = await response.json();
        console.error('Failed to initiate Google Calendar connection:', errorData);
        alert(`Failed to connect Google Calendar: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error connecting to Google Calendar:', error);
      alert('Failed to connect Google Calendar. Please try again.');
    }
  };

  const handleDisconnectGoogleCalendar = async () => {
    try {
      const response = await fetch('/api/auth/google-calendar/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        // Update local state
        if (profile) {
          setProfile({
            ...profile,
            googleCalendarConnected: false,
            syncAppointments: false,
            syncAvailability: false,
          });
        }
      } else {
        console.error('Failed to disconnect Google Calendar');
      }
    } catch (error) {
      console.error('Error disconnecting Google Calendar:', error);
    }
  };

  const handleSyncSettingChange = async (setting: 'appointments' | 'availability', enabled: boolean) => {
    try {
      const response = await fetch('/api/auth/google-calendar/sync-settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [setting]: enabled,
        }),
      });
      
      if (response.ok) {
        // Update local state
        if (profile) {
          setProfile({
            ...profile,
            [setting]: enabled,
          });
        }
      } else {
        console.error(`Failed to update ${setting} sync setting`);
      }
    } catch (error) {
      console.error(`Error updating ${setting} sync setting:`, error);
    }
  };

  // Instagram Integration Handlers
  const handleConnectInstagram = async () => {
    try {
      // Redirect to Instagram OAuth
      const response = await fetch('/api/auth/instagram/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const { authUrl } = await response.json();
        window.location.href = authUrl;
      } else {
        console.error('Failed to initiate Instagram connection');
      }
    } catch (error) {
      console.error('Error connecting to Instagram:', error);
    }
  };

  const handleDisconnectInstagram = async () => {
    try {
      const response = await fetch('/api/auth/instagram/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        // Update local state
        if (profile) {
          setProfile({
            ...profile,
            instagramConnected: false,
            instagramDmEnabled: false,
          });
        }
      } else {
        console.error('Failed to disconnect Instagram');
      }
    } catch (error) {
      console.error('Error disconnecting Instagram:', error);
    }
  };

  const handleInstagramDmSettingChange = async (enabled: boolean) => {
    try {
      const response = await fetch('/api/auth/instagram/dm-settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dmEnabled: enabled,
        }),
      });
      
      if (response.ok) {
        // Update local state
        if (profile) {
          setProfile({
            ...profile,
            instagramDmEnabled: enabled,
          });
        }
      } else {
        console.error('Failed to update Instagram DM setting');
      }
    } catch (error) {
      console.error('Error updating Instagram DM setting:', error);
    }
  };

  // Settings handlers
  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailSuccess('');
    setEmailError('');
    setEmailLoading(true);
    try {
      const res = await fetch('/api/detailer/change-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change email');
      setEmailSuccess('Email changed successfully!');
      setNewEmail('');
      updateSession();
    } catch (err: any) {
      setEmailError(err.message || 'Failed to change email');
    } finally {
      setEmailLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess('');
    setPasswordError('');
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    setPasswordLoading(true);
    try {
      const res = await fetch('/api/detailer/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change password');
      setPasswordSuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Password strength
  const passwordStrength = zxcvbn(newPassword);
  const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColor = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-600'];

  if (loading) return <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
      <p className="text-gray-600 dark:text-gray-400">Loading profile...</p>
    </div>
  </div>;
  
  if (error) return <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6 flex items-center justify-center">
    <div className="text-center">
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        <strong>Error:</strong> {error}
      </div>
      <button 
        onClick={() => window.location.reload()} 
        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
      >
        Retry
      </button>
    </div>
  </div>;
  
  if (!profile) return <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6 flex items-center justify-center">
    <div className="text-center">
      <p className="text-gray-600 dark:text-gray-400">Profile not found</p>
    </div>
  </div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">User Profile</h1>
        {/* My Profile Section */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">My Profile</h2>
            <button className="border border-gray-300 dark:border-gray-600 rounded-full px-4 py-1 text-sm flex items-center gap-2 text-gray-700 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => setEditingSection('profile')}>✏️ Edit</button>
          </div>
          <div className="flex items-center gap-6">
            <img
              src={profile.imageUrl || '/images/default-profile.svg'}
              alt="Profile"
              className="w-20 h-20 rounded-full object-cover cursor-pointer border-2 border-gray-300 hover:border-blue-500 transition"
              onClick={() => setShowProfileImageModal(true)}
              title="Change profile image"
            />
            <div className="flex flex-col gap-2">
              <div className="font-bold text-xl text-gray-900 dark:text-gray-100">{profile.firstName} {profile.lastName}</div>
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
            <button className="border border-gray-300 dark:border-gray-600 rounded-full px-4 py-1 text-sm flex items-center gap-2 text-gray-700 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => setEditingSection('personal')}>✏️ Edit</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-700 dark:text-gray-200">First Name</label>
              <input type="text" value={profile.firstName || ''} disabled className="w-full border rounded p-2 bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100" />
            </div>
            <div>
              <label className="block text-xs text-gray-700 dark:text-gray-200">Last Name</label>
              <input type="text" value={profile.lastName || ''} disabled className="w-full border rounded p-2 bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100" />
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
            <button className="border border-gray-300 dark:border-gray-600 rounded-full px-4 py-1 text-sm flex items-center gap-2 text-gray-700 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => setEditingSection('address')}>✏️ Edit</button>
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
            <button className="border border-gray-300 dark:border-gray-600 rounded-full px-4 py-1 text-sm flex items-center gap-2 text-gray-700 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => setEditingSection('social')}>✏️ Edit</button>
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
        {/* Calendar Integration Section */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Calendar Integration</h2>
          </div>
          
          <div className="space-y-4">
            {/* Google Calendar Connection */}
            <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">Google Calendar</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {profile?.googleCalendarConnected ? 'Connected' : 'Not connected'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {profile?.googleCalendarConnected ? (
                  <>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      ✓ Connected
                    </span>
                    <button
                      onClick={() => handleDisconnectGoogleCalendar()}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Disconnect
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleConnectGoogleCalendar()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                    </svg>
                    <span>Connect</span>
                  </button>
                )}
              </div>
            </div>

            {/* Calendar Sync Status */}
            {profile?.googleCalendarConnected && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-green-800 dark:text-green-200">
                    Your Google Calendar is synced. Appointments will automatically appear in your detailer dashboard calendar.
                  </p>
                </div>
              </div>
            )}

            {/* Sync Settings */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 dark:text-gray-100">Sync Settings</h4>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    checked={profile?.syncAppointments || false}
                    onChange={(e) => handleSyncSettingChange('appointments', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Sync appointments to Google Calendar
                  </span>
                </label>
                <label className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    checked={profile?.syncAvailability || false}
                    onChange={(e) => handleSyncSettingChange('availability', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Update availability based on Google Calendar
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Instagram Integration Section */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Instagram Integration</h2>
          </div>
          
          <div className="space-y-4">
            {/* Instagram Connection */}
            <div className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">Instagram Business</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {profile?.instagramConnected ? 'Connected' : 'Not connected'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {profile?.instagramConnected ? (
                  <>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      ✓ Connected
                    </span>
                    <button
                      onClick={() => handleDisconnectInstagram()}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Disconnect
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleConnectInstagram()}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-purple-600 hover:to-pink-600 transition-colors"
                  >
                    Connect Instagram
                  </button>
                )}
              </div>
            </div>

            {/* Instagram DM Settings */}
            {profile?.instagramConnected && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-green-800 dark:text-green-200">
                    Your Instagram Business account is connected. Enable AI to automatically respond to direct messages.
                  </p>
                </div>
              </div>
            )}

            {/* AI DM Settings */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 dark:text-gray-100">AI Direct Messages</h4>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    checked={profile?.instagramDmEnabled || false}
                    onChange={(e) => handleInstagramDmSettingChange(e.target.checked)}
                    disabled={!profile?.instagramConnected}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 disabled:opacity-50"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Enable AI to respond to Instagram direct messages
                  </span>
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 ml-6">
                  AI will automatically respond to customer inquiries via Instagram DMs
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Business Hours Section */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Business Hours</h2>
            <button className="border border-gray-300 dark:border-gray-600 rounded-full px-4 py-1 text-sm flex items-center gap-2 text-gray-700 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => setEditingSection('businessHours')}>✏️ Edit</button>
          </div>
          <BusinessHoursPicker value={profile.businessHours} onChange={() => {}} />
        </div>

        {/* Account Settings Section */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-6 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">Account Settings</h2>

          {/* Change Email Section */}
          <div className="mb-8">
            <h3 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-4">Change Email</h3>
            <form className="space-y-4" onSubmit={handleEmailChange}>
              <div>
                <label className="block text-gray-700 dark:text-gray-200 mb-1">Current Email</label>
                <input
                  type="email"
                  className="input input-bordered w-full bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  value={session?.user?.email || ''}
                  disabled
                />
              </div>
              <div>
                <label className="block text-gray-700 dark:text-gray-200 mb-1">New Email</label>
                <input
                  type="email"
                  className="input input-bordered w-full bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  placeholder="Enter new email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  required
                />
              </div>
              {emailError && <div className="text-red-600 font-semibold">{emailError}</div>}
              {emailSuccess && <div className="text-green-600 font-semibold">{emailSuccess}</div>}
              <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition" disabled={emailLoading}>
                {emailLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>

          {/* Change Password Section */}
          <div>
            <h3 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-4">Change Password</h3>
            <form className="space-y-4" onSubmit={handlePasswordChange}>
              <div>
                <label className="block text-gray-700 dark:text-gray-200 mb-1">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrent ? "text" : "password"}
                    className="input input-bordered w-full bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 pr-10"
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={() => setShowCurrent(v => !v)}
                    tabIndex={-1}
                  >
                    <img
                      src={showCurrent
                        ? "https://reevacar.s3.us-east-2.amazonaws.com/change-password-detailer/view.svg"
                        : "https://reevacar.s3.us-east-2.amazonaws.com/change-password-detailer/hidden.svg"}
                      alt={showCurrent ? "Hide password" : "Show password"}
                      className="h-5 w-5"
                    />
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-gray-700 dark:text-gray-200 mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showNew ? "text" : "password"}
                    className="input input-bordered w-full bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 pr-10"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={() => setShowNew(v => !v)}
                    tabIndex={-1}
                  >
                    <img
                      src={showNew
                        ? "https://reevacar.s3.us-east-2.amazonaws.com/change-password-detailer/view.svg"
                        : "https://reevacar.s3.us-east-2.amazonaws.com/change-password-detailer/hidden.svg"}
                      alt={showNew ? "Hide password" : "Show password"}
                      className="h-5 w-5"
                    />
                  </button>
                </div>
                {newPassword && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className={`h-2 w-24 rounded ${strengthColor[passwordStrength.score]}`}></div>
                    <span className={`text-xs font-semibold ${strengthColor[passwordStrength.score]}`}>{strengthLabels[passwordStrength.score]}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-gray-700 dark:text-gray-200 mb-1">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    className="input input-bordered w-full bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 pr-10"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={() => setShowConfirm(v => !v)}
                    tabIndex={-1}
                  >
                    <img
                      src={showConfirm
                        ? "https://reevacar.s3.us-east-2.amazonaws.com/change-password-detailer/view.svg"
                        : "https://reevacar.s3.us-east-2.amazonaws.com/change-password-detailer/hidden.svg"}
                      alt={showConfirm ? "Hide password" : "Show password"}
                      className="h-5 w-5"
                    />
                  </button>
                </div>
              </div>
              {passwordError && <div className="text-red-600 font-semibold">{passwordError}</div>}
              {passwordSuccess && <div className="text-green-600 font-semibold">{passwordSuccess}</div>}
              <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition" disabled={passwordLoading}>
                {passwordLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
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
                images={profile?.imageUrl ? [{ url: profile.imageUrl, alt: 'Profile Image', type: 'profile' }] : []}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 