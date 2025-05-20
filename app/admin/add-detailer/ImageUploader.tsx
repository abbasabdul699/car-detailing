import React, { useRef, useState } from "react";

interface ImageUploaderProps {
  businessName: string;
  detailerId: string;
  onUpload: (url: string) => void;
  type: 'profile' | 'portfolio';
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

        // Validate file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
          setError('Image size should be less than 5MB');
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

        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(data.error || 'Upload failed');
        }

        if (!data.image?.url) {
          throw new Error('No image URL returned');
        }

        onUpload(data.image.url);
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
        className="file-input file-input-bordered w-full"
        disabled={uploading}
      />

      {uploading && <p className="text-blue-500">Uploading images...</p>}
      {error && (
        <div className="text-red-500 font-semibold">
          {error}
          <button
            type="button"
            className="ml-2 underline text-blue-600 hover:text-blue-800"
            onClick={() => {
              setError(null);
              setPreviews({});
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