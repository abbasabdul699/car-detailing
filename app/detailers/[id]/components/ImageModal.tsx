'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface ImageModalProps {
  images: DetailerImage[];
  currentIndex: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}

export default function ImageModal({ images, currentIndex, onClose, onPrev, onNext }: ImageModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const image = images[currentIndex];

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="relative w-[90vw] h-[90vh] rounded-lg overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <button
          className="absolute top-4 right-4 z-50 bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-70 transition-opacity"
          onClick={onClose}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {isLoading && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="text-white text-center">
              <p>Error loading image</p>
              <button 
                className="mt-2 px-4 py-2 bg-white text-black rounded hover:bg-gray-200"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </div>
        )}

        <div className="w-full h-full flex items-center justify-center">
          <button onClick={onPrev} className="absolute left-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-70 transition-opacity">Prev</button>
          <button onClick={onNext} className="absolute right-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-70 transition-opacity">Next</button>
          <img
            src={image.url}
            alt={image.alt}
            className="max-w-full max-h-full object-contain"
            onLoad={() => setIsLoading(false)}
            onError={() => {
              console.error('Error loading image:', image.url);
              setError(true);
              setIsLoading(false);
            }}
          />
        </div>
      </div>
    </div>
  );
} 