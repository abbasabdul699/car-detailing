'use client'

import { useState } from 'react'
import { StarIcon } from '@heroicons/react/24/solid'

interface AddReviewFormProps {
  onClose: () => void
  onSubmit: (review: any) => void
}

export default function AddReviewForm({ onClose, onSubmit }: AddReviewFormProps) {
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [reviewType, setReviewType] = useState<'user' | 'detailer'>('user')
  const [formData, setFormData] = useState({
    name: '',
    review: '',
    serviceType: '',
    businessLocation: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Log the data being sent
    console.log('Submitting review:', {
      ...formData,
      rating,
      type: reviewType,
      date: new Date().toISOString(),
    });

    onSubmit({
      ...formData,
      rating,
      type: reviewType,
      date: new Date().toISOString(),
      // Remove the id field as MongoDB will generate one
      verified: false, // Let's set this to false by default
    });
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6">Share Your Experience</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Review Type Selection */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setReviewType('user')}
              className={`flex-1 py-3 px-4 rounded-lg border ${
                reviewType === 'user' 
                  ? 'border-[#389167] bg-[#389167] text-white' 
                  : 'border-gray-200'
              }`}
            >
              I'm a Customer
            </button>
            <button
              type="button"
              onClick={() => setReviewType('detailer')}
              className={`flex-1 py-3 px-4 rounded-lg border ${
                reviewType === 'detailer' 
                  ? 'border-[#389167] bg-[#389167] text-white' 
                  : 'border-gray-200'
              }`}
            >
              I'm a Detailer
            </button>
          </div>

          {/* Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rating
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(star)}
                  className="focus:outline-none"
                >
                  <StarIcon
                    className={`w-8 h-8 ${
                      star <= (hoveredRating || rating) 
                        ? 'text-yellow-400' 
                        : 'text-gray-200'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {reviewType === 'user' ? 'Your Name' : 'Business Name'}
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#389167] focus:border-transparent"
            />
          </div>

          {/* Conditional Fields */}
          {reviewType === 'user' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Service Type
              </label>
              <input
                type="text"
                value={formData.serviceType}
                onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#389167] focus:border-transparent"
                placeholder="e.g., Full Detail, Interior Clean"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Location
              </label>
              <input
                type="text"
                value={formData.businessLocation}
                onChange={(e) => setFormData({ ...formData, businessLocation: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#389167] focus:border-transparent"
                placeholder="e.g., Los Angeles, CA"
              />
            </div>
          )}

          {/* Review Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Review
            </label>
            <textarea
              required
              value={formData.review}
              onChange={(e) => setFormData({ ...formData, review: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#389167] focus:border-transparent"
              rows={4}
              placeholder="Share your experience..."
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 px-4 bg-[#389167] text-white rounded-lg hover:bg-[#389167]/90"
            >
              Submit Review
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 