import { StarIcon, CheckBadgeIcon } from '@heroicons/react/24/solid'

interface ReviewCardProps {
  review: {
    name: string
    rating: number
    date: string
    review: string
    type: 'user' | 'detailer'
    verified: boolean
    serviceType?: string
    businessLocation?: string
    memberSince?: string
  }
}

export default function ReviewCard({ review }: ReviewCardProps) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{review.name}</h3>
            {review.verified && (
              <CheckBadgeIcon className="w-5 h-5 text-[#389167]" />
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <StarIcon
                  key={i}
                  className={`w-4 h-4 ${
                    i < review.rating ? 'text-yellow-400' : 'text-gray-200'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm text-gray-500">
              {new Date(review.date).toLocaleDateString()}
            </span>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          review.type === 'user' 
            ? 'bg-blue-50 text-blue-700'
            : 'bg-purple-50 text-purple-700'
        }`}>
          {review.type === 'user' ? 'Customer' : 'Detailer'}
        </span>
      </div>

      {/* Review Content */}
      <p className="text-gray-600 mb-4">{review.review}</p>

      {/* Footer */}
      <div className="text-sm text-gray-500">
        {review.type === 'user' && review.serviceType && (
          <div>Service: {review.serviceType}</div>
        )}
        {review.type === 'detailer' && (
          <>
            <div>Location: {review.businessLocation}</div>
            <div>Member since: {review.memberSince}</div>
          </>
        )}
      </div>
    </div>
  )
} 