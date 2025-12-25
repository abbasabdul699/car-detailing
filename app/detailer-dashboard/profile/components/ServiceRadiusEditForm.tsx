'use client';
import React, { useState, useEffect } from 'react';

interface Profile {
  id: string;
  serviceRadius?: number;
}

interface ServiceRadiusEditFormProps {
  profile: Profile | null;
  onClose: () => void;
  onSave: (updated: Profile) => void;
}

export default function ServiceRadiusEditForm({ profile, onClose, onSave }: ServiceRadiusEditFormProps) {
  const [serviceRadius, setServiceRadius] = useState<number>(25);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile?.serviceRadius) {
      setServiceRadius(profile.serviceRadius);
    }
  }, [profile]);

  const handleSave = async () => {
    if (!profile) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/detailer/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serviceRadius: serviceRadius,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update service radius');
      }

      const updatedProfile = { ...profile, serviceRadius };
      onSave(updatedProfile);
    } catch (error) {
      console.error('Error updating service radius:', error);
      alert('Failed to update service radius. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-blue-700 mb-1">Service Radius (miles)</label>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-600">1 mile</span>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{serviceRadius}</div>
                <div className="text-xs text-blue-500">miles</div>
              </div>
              <span className="text-sm text-blue-600">100 miles</span>
            </div>
            <input
              type="range"
              value={serviceRadius}
              onChange={(e) => setServiceRadius(parseInt(e.target.value))}
              min="1"
              max="100"
              className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((serviceRadius - 1) / 99) * 100}%, #e5e7eb ${((serviceRadius - 1) / 99) * 100}%, #e5e7eb 100%)`
              }}
            />
            <p className="text-xs text-blue-500">Maximum distance you're willing to travel for service</p>
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <div className="text-blue-600 mt-0.5">ℹ️</div>
            <div className="text-sm text-blue-800">
              <strong>How it works:</strong> When customers book appointments, the system automatically checks if their address is within your service radius. Customers outside this area will be politely informed that you don't service their location.
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button
          onClick={onClose}
          className="px-4 py-2 border border-blue-300 rounded-lg text-blue-700 hover:bg-blue-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
