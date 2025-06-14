'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AiUploadStep({ params }: { params: { detailerId: string } }) {
  const { detailerId } = params;
  const searchParams = useSearchParams();
  const service = searchParams.get('service');
  const [vehiclePhoto, setVehiclePhoto] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  const handleVehiclePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setVehiclePhoto(e.target.files[0]);
    }
  };

  const handleContinue = async () => {
    if (!vehiclePhoto) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('photo', vehiclePhoto);
    try {
      const res = await fetch('/api/ai/vehicle-detect', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      // Pass detected vehicle info to confirmation page
      router.push(
        `/book/${detailerId}/ai-confirm-vehicle?service=${encodeURIComponent(service ?? '')}&vehicle=${encodeURIComponent(JSON.stringify(data.detectedVehicle ?? {}))}`
      );
    } catch (err) {
      alert('Failed to get AI result. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleBack = () => {
    router.push(`/book/${detailerId}/ai-or-manual?service=${encodeURIComponent(service ?? '')}`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-xl shadow p-12 w-full max-w-2xl md:max-w-3xl animate-fadein">
        <button onClick={handleBack} className="mb-4 text-gray-500 hover:text-black text-3xl">&larr;</button>
        <h1 className="text-2xl font-bold mb-6">Upload a Photo of Your Vehicle</h1>
        <div className="mb-8">
          <label className="block font-semibold mb-2">Main Vehicle Photo</label>
          <label
            htmlFor="vehicle-photo"
            className="inline-block px-4 py-2 bg-black text-white rounded cursor-pointer mb-2"
          >
            📷 Take or Choose Photo
          </label>
          <input
            id="vehicle-photo"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleVehiclePhotoChange}
            className="hidden"
          />
          <div className="text-gray-500 text-sm mb-2">
            On your phone, tap the button to take a photo or choose one from your gallery.
          </div>
          {vehiclePhoto && <div className="mb-2 text-green-600">Photo selected: {vehiclePhoto.name}</div>}
        </div>
        <button
          className="w-full py-3 rounded-full bg-black text-white font-semibold disabled:bg-gray-300 disabled:text-gray-500 transition"
          disabled={!vehiclePhoto || uploading}
          onClick={handleContinue}
        >
          {uploading ? 'Detecting...' : 'Continue'}
        </button>
      </div>
      <style jsx global>{`
        .animate-fadein {
          animation: fadein 0.5s;
        }
        @keyframes fadein {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
} 