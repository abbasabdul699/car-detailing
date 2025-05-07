"use client";
import React, { useRef, useState } from "react";

interface ImageUploaderProps {
  businessName: string;
  detailerId: string;
  onUpload: (url: string) => void;
}

export default function ImageUploader({ businessName, detailerId, onUpload }: ImageUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageType, setImageType] = useState<'profile' | 'portfolio'>('portfolio');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }

    setPreview(URL.createObjectURL(file));
    setError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("businessName", businessName || 'detailer');
      formData.append("detailerId", detailerId);
      formData.append("type", imageType);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      if (!data.image?.url) {
        throw new Error('No image URL returned');
      }

      onUpload(data.image.url);
    } catch (err: any) {
      setError(err.message || 'Failed to upload image');
      // Clear preview on error
      setPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-4 mb-2">
        <label className="inline-flex items-center">
          <input
            type="radio"
            name="imageType"
            value="profile"
            checked={imageType === 'profile'}
            onChange={() => setImageType('profile')}
            className="mr-1"
          />
          Profile Image
        </label>
        <label className="inline-flex items-center">
          <input
            type="radio"
            name="imageType"
            value="portfolio"
            checked={imageType === 'portfolio'}
            onChange={() => setImageType('portfolio')}
            className="mr-1"
          />
          Portfolio Image
        </label>
      </div>
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="file-input file-input-bordered w-full"
        disabled={uploading}
      />
      {preview && (
        <img src={preview} alt="Preview" className="w-32 h-32 object-cover rounded border" />
      )}
      {uploading && <p className="text-blue-500">Uploading...</p>}
      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
} 