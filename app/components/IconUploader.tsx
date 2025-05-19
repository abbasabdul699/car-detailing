"use client";
import React, { useRef, useState } from "react";

interface IconUploaderProps {
  onUpload: (url: string) => void;
}

export default function IconUploader({ onUpload }: IconUploaderProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type (SVG only)
    if (file.type !== 'image/svg+xml') {
      setError('Please select an SVG file');
      return;
    }

    // Validate file size (1MB limit for icons)
    if (file.size > 1024 * 1024) {
      setError('SVG size should be less than 1MB');
      return;
    }

    setPreview(URL.createObjectURL(file));
    setError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "icon");

      const res = await fetch("/api/upload/service-icon", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }
      if (!data.imageUrl) {
        throw new Error('No image URL returned');
      }
      onUpload(data.imageUrl);
    } catch (err: any) {
      setError(err.message || 'Failed to upload icon');
      setPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <input
        type="file"
        accept="image/svg+xml"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="file-input file-input-bordered w-full"
        disabled={uploading}
      />
      {preview && (
        <img src={preview} alt="Preview" className="w-16 h-16 object-contain border rounded" />
      )}
      {uploading && <p className="text-blue-500">Uploading...</p>}
      {error && (
        <div className="text-red-500 font-semibold">
          {error}
          <button
            type="button"
            className="ml-2 underline text-blue-600 hover:text-blue-800"
            onClick={() => {
              setError(null);
              setPreview(null);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
} 