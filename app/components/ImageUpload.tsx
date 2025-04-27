// components/ImageUpload.tsx
"use client";

import { useState } from 'react';
import Image from 'next/image';

interface ImageUploadProps {
  detailerId: string;
  businessName: string;
  onUploadComplete: (imageUrl: string) => void;
}

export default function ImageUpload({
  detailerId,
  businessName,
  onUploadComplete
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;

    const file = e.target.files[0];
    setPreview(URL.createObjectURL(file));
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('businessName', businessName);
      formData.append('detailerId', detailerId);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      onUploadComplete(data.image.url);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
        {preview ? (
          <div className="relative h-48 w-full">
            <Image
              src={preview}
              alt="Preview"
              fill
              className="object-cover rounded-lg"
            />
          </div>
        ) : (
          <div className="text-center">
            <label className="cursor-pointer">
              <span className="text-blue-600 hover:text-blue-500">
                Upload image
              </span>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleUpload}
                disabled={uploading}
              />
            </label>
          </div>
        )}
      </div>
      {uploading && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
          <div className="text-sm text-gray-600">Uploading...</div>
        </div>
      )}
    </div>
  );
}