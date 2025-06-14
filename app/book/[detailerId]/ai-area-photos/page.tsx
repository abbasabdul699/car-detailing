'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AiAreaPhotosStep({ params }: { params: { detailerId: string } }) {
  const { detailerId } = params;
  const searchParams = useSearchParams();
  const service = searchParams.get('service');
  const vehicle = searchParams.get('vehicle');
  const [areaPhotos, setAreaPhotos] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const router = useRouter();

  const handleAreaPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAreaPhotos(Array.from(e.target.files));
    }
  };

  const handleAnalyze = async () => {
    if (areaPhotos.length === 0) return;
    setUploading(true);
    const formData = new FormData();
    areaPhotos.forEach((file) => formData.append('photos', file));
    try {
      const res = await fetch('/api/ai/area-detect', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setRecommendations(data.recommendedServices || []);
      setSelectedServices(data.recommendedServices || []);
    } catch (err) {
      alert('Failed to get recommendations. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleContinue = async () => {
    // 1. Upload area photos to your backend (e.g., /api/upload)
    const uploadedImageUrls: string[] = [];
    for (const file of areaPhotos) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'area'); // Optional: label for your backend
      formData.append('detailerId', detailerId); // Optional: if you want to associate with detailer

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.image?.url) {
        uploadedImageUrls.push(data.image.url);
      }
    }

    // 2. Navigate to review page, passing image URLs and other info
    router.push(
      `/book/${detailerId}/review?service=${encodeURIComponent(selectedServices.join(','))}&vehicle=${encodeURIComponent(vehicle ?? '')}&areaImages=${encodeURIComponent(JSON.stringify(uploadedImageUrls))}`
    );
  };

  const handleBack = () => {
    router.push(
      `/book/${detailerId}/ai-confirm-vehicle?service=${encodeURIComponent(service ?? '')}&vehicle=${encodeURIComponent(vehicle ?? '')}`
    );
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-xl shadow p-12 w-full max-w-2xl md:max-w-3xl animate-fadein">
        <button onClick={handleBack} className="mb-4 text-gray-500 hover:text-black text-3xl">&larr;</button>
        <h1 className="text-2xl font-bold mb-6">Upload Area Photos</h1>
        <div className="mb-8">
          <label className="block font-semibold mb-2">Upload photos of the area(s) you want cleaned</label>
          <input
            type="file"
            accept="image/*"
            multiple
            capture="environment"
            onChange={handleAreaPhotoChange}
            className="mb-2"
          />
          <div className="text-gray-500 text-sm mb-2">
            Take or select one or more photos.
          </div>
          {areaPhotos.length > 0 && (
            <div className="mb-2 text-green-600">
              {areaPhotos.length} photo{areaPhotos.length > 1 ? 's' : ''} selected
            </div>
          )}
        </div>
        <button
          className="w-full py-3 rounded-full bg-black text-white font-semibold disabled:bg-gray-300 disabled:text-gray-500 transition mb-4"
          disabled={areaPhotos.length === 0 || uploading}
          onClick={handleAnalyze}
        >
          {uploading ? 'Analyzing...' : 'Analyze & Recommend Services'}
        </button>
        {recommendations.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold mb-2">Recommended Services</h2>
            <div className="space-y-2">
              {recommendations.map(service => (
                <label key={service} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedServices.includes(service)}
                    onChange={e => {
                      if (e.target.checked) {
                        setSelectedServices([...selectedServices, service]);
                      } else {
                        setSelectedServices(selectedServices.filter(s => s !== service));
                      }
                    }}
                  />
                  <span>{service}</span>
                </label>
              ))}
            </div>
          </div>
        )}
        {recommendations.length > 0 && (
          <button
            className="w-full py-3 rounded-full bg-green-600 text-white font-semibold hover:bg-green-700 transition"
            onClick={handleContinue}
            disabled={selectedServices.length === 0}
          >
            Continue
          </button>
        )}
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
