"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import ImageUploader from "../../components/ImageUploader";

interface PortfolioImage {
  id: string;
  url: string;
  createdAt: string;
}

export default function ManageImagesPage() {
  const { data: session } = useSession();
  const [images, setImages] = useState<PortfolioImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Fetch images on mount
  useEffect(() => {
    async function fetchImages() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/detailer/portfolio-images");
        if (!res.ok) throw new Error("Failed to fetch images");
        const data = await res.json();
        setImages(data);
      } catch (err: any) {
        setError(err.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchImages();
  }, []);

  // Refresh images after upload
  const handleUpload = async (url: string) => {
    // The /api/upload endpoint already saved the image to the database
    // So we just need to refresh the images list
    try {
      const res = await fetch("/api/detailer/portfolio-images");
      if (!res.ok) throw new Error("Failed to fetch images");
      const data = await res.json();
      setImages(data);
    } catch (err: any) {
      setError(err.message || "Failed to refresh images");
    }
  };

  // Delete image
  const handleDelete = async (url: string) => {
    const image = images.find((img) => img.url === url);
    if (!image) return;
    if (!window.confirm("Are you sure you want to delete this image?")) return;
    try {
      const res = await fetch("/api/detailer/portfolio-images", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: image.id }),
      });
      if (!res.ok) throw new Error("Failed to delete image");
      setImages((prev) => prev.filter((img) => img.id !== image.id));
    } catch (err: any) {
      setError(err.message || "Failed to delete image");
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-10 bg-white rounded-xl shadow p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-900">Manage Images</h1>
      <div className="mb-6">
        <ImageUploader
          businessName="Demo Detailer"
          detailerId={session?.user?.id}
          onUpload={handleUpload}
          type="portfolio"
        />
      </div>
      {loading ? (
        <div>Loading images...</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : images.length === 0 ? (
        <div className="text-gray-500">No portfolio images found. Click "Upload Images" to add your first portfolio image.</div>
      ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {images.map((img, idx) => (
            <div key={img.id} className="relative group rounded-2xl border border-gray-200 shadow-sm overflow-hidden bg-white flex flex-col aspect-[4/3]">
              <img 
                src={img.url} 
                alt={`Portfolio ${idx + 1}`} 
                className="object-cover w-full h-full cursor-pointer hover:opacity-90 transition-opacity" 
                style={{ aspectRatio: '4/3' }} 
                onClick={() => setSelectedImage(img.url)}
              />
            <button
              onClick={() => handleDelete(img.url)}
              className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              title="Delete image"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="flex-1 flex items-center justify-center text-gray-700 text-sm font-medium p-2">
                Portfolio {idx + 1}
            </div>
            <div className="bg-gray-700 text-white text-xs px-2 py-1 text-center">Portfolio</div>
          </div>
        ))}
      </div>
      )}
      
      {/* Fullscreen Image Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center p-4">
            <img 
              src={selectedImage} 
              alt="Portfolio image" 
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-full p-2 transition-all"
              title="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 