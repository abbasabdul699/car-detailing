'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReviewCard from './components/ReviewCard'
import ReviewFilter from './components/ReviewFilter'
import AddReviewForm from './components/AddReviewForm'

export default function ReviewsPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'users' | 'detailers'>('all')
  const [sortBy, setSortBy] = useState<'recent' | 'rating'>('recent')
  const [showAddReview, setShowAddReview] = useState(false)
  const [reviews, setReviews] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch reviews on component mount
  useEffect(() => {
    fetchReviews()
  }, [])

  const fetchReviews = async () => {
    try {
      const response = await fetch('/api/reviews')
      const result = await response.json()
      if (result.success) {
        setReviews(result.data)
      } else {
        console.error('Failed to fetch reviews:', result.error)
      }
    } catch (error) {
      console.error('Failed to fetch reviews:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddReview = async (newReview: any) => {
    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newReview),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit review')
      }

      setReviews([result.data, ...reviews])
      setShowAddReview(false)
    } catch (error) {
      console.error('Error submitting review:', error)
      // You might want to show this error to the user
      alert(error instanceof Error ? error.message : 'Failed to submit review')
    }
  }

  const getFilteredReviews = () => {
    let filteredReviews = [...reviews]
    
    // Filter by type
    if (activeTab !== 'all') {
      filteredReviews = filteredReviews.filter(review => review.type === activeTab)
    }

    // Sort reviews
    return filteredReviews.sort((a, b) => {
      if (sortBy === 'recent') {
        return new Date(b.date).getTime() - new Date(a.date).getTime()
      }
      return b.rating - a.rating
    })
  }

  return (
    <div className="min-h-screen bg-[#F3F3F3]">
      <main className="pt-32 pb-24">
        <div className="max-w-7xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              What Our Community Says
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Real experiences from our users and detailing partners
            </p>
            <button
              onClick={() => setShowAddReview(true)}
              className="bg-[#389167] text-white px-6 py-3 rounded-lg hover:bg-[#389167]/90 transition-colors"
            >
              Share Your Experience
            </button>
          </div>

          {/* Filters */}
          <ReviewFilter 
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            sortBy={sortBy}
            setSortBy={setSortBy}
          />

          {/* Reviews Grid */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <AnimatePresence mode="popLayout">
              {getFilteredReviews().map((review) => (
                <motion.div
                  key={`${review.type}-${review.id}`}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <ReviewCard review={review} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Add Review Modal */}
      <AnimatePresence>
        {showAddReview && (
          <AddReviewForm
            onClose={() => setShowAddReview(false)}
            onSubmit={handleAddReview}
          />
        )}
      </AnimatePresence>
    </div>
  )
} 