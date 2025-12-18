"use client";
import React, { useRef, useState } from "react";

interface ImageUploaderProps {
  businessName: string;
  detailerId?: string;
  onUpload: (url: string, type: string) => void;
  type: 'profile' | 'portfolio' | 'bundle';
  images?: { url: string; alt: string; type?: string }[];
  onDelete?: (url: string) => void;
}

export default function ImageUploader({ 
  businessName, 
  detailerId, 
  onUpload, 
  type,
  images = [],
  onDelete 
}: ImageUploaderProps) {
  const [previews, setPreviews] = useState<{ [key: string]: string }>({});
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    setError(null);
    setUploading(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Validate file type
        if (!file.type.startsWith('image/')) {
          setError('Please select only image files');
          continue;
        }

        // Validate file size (4MB limit to stay under Vercel's 4.5MB limit)
        const maxFileSize = 4 * 1024 * 1024; // 4MB
        if (file.size > maxFileSize) {
          setError('Image size must be less than 4MB. Please compress your image or use a smaller file.');
          continue;
        }

        // Create preview
        setPreviews(prev => ({
          ...prev,
          [file.name]: URL.createObjectURL(file)
        }));

        const formData = new FormData();
        formData.append("file", file);
        formData.append("businessName", businessName || 'detailer');
        formData.append("detailerId", detailerId);
        formData.append("type", type);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        // Handle 413 Payload Too Large errors gracefully
        if (res.status === 413) {
          throw new Error('File is too large. Maximum size is 4MB. Please compress your image or use a smaller file.');
        }

        // Try to parse JSON, but handle non-JSON responses
        let data;
        try {
          data = await res.json();
        } catch (parseError) {
          // If response is not JSON (e.g., HTML error page), provide a helpful error
          throw new Error(`Upload failed: Server returned ${res.status} ${res.statusText}. File may be too large (max 4MB).`);
        }
        
        if (!res.ok) {
          throw new Error(data.error || `Upload failed: ${res.status} ${res.statusText}`);
        }

        if (!data.image?.url) {
          throw new Error('No image URL returned');
        }

        onUpload(data.image.url, type);

        // Remove preview after upload
        setPreviews(prev => {
          const newPreviews = { ...prev };
          delete newPreviews[file.name];
          return newPreviews;
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload image');
      console.error('Image upload error:', err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (url: string) => {
    if (!onDelete) return;
    if (!window.confirm('Are you sure you want to delete this image?')) return;
    onDelete(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        {images.map((image, index) => (
          <div key={index} className="relative group">
            <img 
              src={image.url} 
              alt={image.alt || 'Detailer image'} 
              className="w-32 h-32 object-cover rounded border"
            />
            {onDelete && (
              <button
                onClick={() => handleDelete(image.url)}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        ))}
        {Object.entries(previews).map(([name, url]) => (
          <div key={name} className="relative">
            <img src={url} alt="Preview" className="w-32 h-32 object-cover rounded border" />
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <span className="text-white text-sm">Uploading...</span>
            </div>
          </div>
        ))}
      </div>

      <input
        type="file"
        accept="image/*"
        multiple
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        disabled={uploading}
      />
      <button
        type="button"
        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded shadow transition-all duration-200 disabled:opacity-50"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
      >
        Upload Image{type === 'portfolio' ? 's' : ''}
      </button>

      {uploading && <p className="text-blue-500">Uploading images...</p>}
      {error && (
        <div className={`rounded-lg border-2 p-4 ${
          error.toLowerCase().includes('too large') || error.toLowerCase().includes('size')
            ? 'bg-red-50 border-red-300'
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <h4 className="text-red-800 font-semibold mb-1">
                {error.toLowerCase().includes('too large') || error.toLowerCase().includes('size')
                  ? 'File Too Large'
                  : 'Upload Error'}
              </h4>
              <p className="text-red-700 text-sm mb-3">{error}</p>
          <button
            type="button"
                className="text-sm bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded transition-colors"
            onClick={() => {
              setError(null);
              setPreviews({});
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
          >
                Dismiss
          </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 