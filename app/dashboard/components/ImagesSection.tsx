'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { FaStar, FaTrash } from 'react-icons/fa';

interface ImageData {
  id: string;
  url: string;
  alt: string;
  isFeatured: boolean;
}

export default function ImagesSection() {
  const [images, setImages] = useState<ImageData[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    try {
      const response = await fetch('/api/detailers/profile');
      if (!response.ok) throw new Error('Failed to fetch images');
      const data = await response.json();
      setImages(data.images || []);
    } catch (err) {
      console.error('Error fetching images:', err);
      setError('Failed to load images');
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) return;

    setIsUploading(true);
    setError('');

    try {
      const formData = new FormData();
      Array.from(event.target.files).forEach((file) => {
        formData.append('images', file);
      });

      const response = await fetch('/api/detailers/images', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to upload images');

      // Refresh images list
      fetchImages();
    } catch (err) {
      console.error('Upload error:', err);
      setError('Failed to upload images');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    try {
      const response = await fetch(`/api/detailers/images/${imageId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete image');
      }

      setImages(images.filter((img) => img.id !== imageId));
    } catch (err) {
      setError('Failed to delete image');
    }
  };

  const setFeaturedImage = async (imageId: string) => {
    try {
      const response = await fetch(`/api/detailers/images/${imageId}`, {
        method: 'PUT'
      });

      if (!response.ok) throw new Error('Failed to set featured image');

      // Refresh images list
      fetchImages();
    } catch (err) {
      console.error('Error setting featured image:', err);
      setError('Failed to set featured image');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Gallery Images</h2>
        <label className="cursor-pointer bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
          Upload Images
          <input
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
            disabled={isUploading}
          />
        </label>
      </div>

      {error && (
        <div className="text-red-500 bg-red-50 p-3 rounded">
          {error}
        </div>
      )}

      {isUploading && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Uploading images...</p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((image) => (
          <div key={image.id} className="relative group">
            <div className="aspect-square relative overflow-hidden rounded-lg">
              <Image
                src={image.url}
                alt={image.alt}
                fill
                className="object-cover"
              />
            </div>
            <button
              onClick={() => setFeaturedImage(image.id)}
              className={`absolute top-2 right-2 p-2 rounded-full 
                ${image.isFeatured ? 'bg-green-500' : 'bg-gray-500'} 
                text-white opacity-0 group-hover:opacity-100 transition-opacity`}
            >
              ★
            </button>
          </div>
        ))}
      </div>
    </div>
  );
} 