"use client";

import { useState } from 'react';

interface SocialMediaData {
  instagram?: string;
  tiktok?: string;
  website?: string;
}

export default function SocialMediaSection() {
  const [socialData, setSocialData] = useState<SocialMediaData>({});
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/detailers/social', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(socialData),
      });

      if (!response.ok) {
        throw new Error('Failed to update social media links');
      }

      setIsEditing(false);
      setError('');
    } catch (err) {
      setError('Failed to update social media links');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Social Media Links</h2>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="text-[#389167] hover:text-[#1D503A]"
        >
          {isEditing ? 'Cancel' : 'Edit'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-500 p-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Instagram
            </label>
            <input
              type="text"
              value={socialData.instagram || ''}
              onChange={(e) =>
                setSocialData({ ...socialData, instagram: e.target.value })
              }
              disabled={!isEditing}
              className="w-full p-2 border rounded-lg"
              placeholder="Instagram profile URL"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              TikTok
            </label>
            <input
              type="text"
              value={socialData.tiktok || ''}
              onChange={(e) =>
                setSocialData({ ...socialData, tiktok: e.target.value })
              }
              disabled={!isEditing}
              className="w-full p-2 border rounded-lg"
              placeholder="TikTok profile URL"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Website
            </label>
            <input
              type="text"
              value={socialData.website || ''}
              onChange={(e) =>
                setSocialData({ ...socialData, website: e.target.value })
              }
              disabled={!isEditing}
              className="w-full p-2 border rounded-lg"
              placeholder="Business website URL"
            />
          </div>

          {isEditing && (
            <button
              type="submit"
              className="w-full bg-[#389167] text-white py-2 rounded-lg hover:bg-[#1D503A]"
            >
              Save Changes
            </button>
          )}
        </div>
      </form>
    </div>
  );
} 