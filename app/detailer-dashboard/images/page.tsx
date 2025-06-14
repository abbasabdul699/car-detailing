"use client";
import { useState } from "react";
import ImageUploader from "../../components/ImageUploader";

// Mock images
const mockImages = [
  { url: "/images/detailers/default-business.jpg", alt: "Profile Image", type: "profile" },
  { url: "/images/detailers/default-business.jpg", alt: "Portfolio 1", type: "portfolio" },
  { url: "/images/detailers/default-business.jpg", alt: "Portfolio 2", type: "portfolio" },
];

export default function ManageImagesPage() {
  const [images, setImages] = useState(mockImages);

  const handleUpload = (url: string) => {
    setImages((prev) => [...prev, { url, alt: `Uploaded Image`, type: "portfolio" }]);
  };

  const handleDelete = (url: string) => {
    setImages((prev) => prev.filter((img) => img.url !== url));
  };

  return (
    <div className="max-w-4xl mx-auto py-10 bg-white dark:bg-gray-900 rounded-xl shadow p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">Manage Images</h1>
      <div className="mb-6">
        <ImageUploader
          businessName="Demo Detailer"
          detailerId="demo-id"
          onUpload={handleUpload}
          type="portfolio"
          images={[]}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {images.filter(img => img.type === 'portfolio').map((img, idx) => (
          <div key={idx} className="relative group rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden bg-white flex flex-col aspect-[4/3]">
            <img src={img.url} alt={img.alt} className="object-cover w-full h-full" style={{ aspectRatio: '4/3' }} />
            <button
              onClick={() => handleDelete(img.url)}
              className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              title="Delete image"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="flex-1 flex items-center justify-center text-gray-700 dark:text-gray-200 text-sm font-medium p-2">
              {img.alt}
            </div>
            <div className="bg-gray-700 text-white text-xs px-2 py-1 text-center">Portfolio</div>
          </div>
        ))}
      </div>
    </div>
  );
} 