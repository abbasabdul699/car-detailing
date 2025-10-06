import Image from 'next/image'
import { useRouter } from 'next/navigation'

interface DetailerCardProps {
  id: string
  businessName: string
  priceRange: string
  description?: string
  images?: {
    url: string
    alt: string
    type?: string
  }[]
  latitude?: number
  longitude?: number
  onClick?: () => void
  isSelected?: boolean
}

export default function DetailerCard({ 
  id, 
  businessName, 
  priceRange, 
  description, 
  images,
  onClick,
  isSelected = false 
}: DetailerCardProps) {
  const router = useRouter()

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    onClick?.()
  }

  const handleViewProfile = (e: React.MouseEvent) => {
    e.stopPropagation()
    router.push(`/detailers/${id}`)
  }

  return (
    <div 
      onClick={handleClick}
      className={`
        w-full bg-white rounded-xl shadow-sm transition-all duration-200 hover:shadow-md
        ${isSelected ? 'ring-2 ring-[#389167] bg-[#F0F7F0]' : 'hover:bg-gray-50'}
      `}
    >
      <div className="flex p-4 gap-4">
        <div className="relative w-32 h-32 rounded-lg overflow-hidden flex-shrink-0">
          <Image
            src={images?.find(img => img.type === 'profile')?.url || images?.[0]?.url || '/images/detailers/default-business.jpg'}
            alt={images?.find(img => img.type === 'profile')?.alt || images?.[0]?.alt || businessName}
            fill
            className="object-cover"
          />
        </div>
        
        <div className="flex-grow min-w-0">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {businessName}
            </h3>
            <span className="text-[#389167] font-medium text-sm">
              {priceRange || 'Contact for pricing'}
            </span>
          </div>
          
          {description && (
            <p className="text-sm text-gray-600 line-clamp-2 mb-3">
              {description.split(' ').slice(0, 12).join(' ') + 
               (description.split(' ').length > 12 ? '...' : '')}
            </p>
          )}

          <button
            onClick={handleViewProfile}
            className="text-[#389167] hover:text-[#1D503A] text-sm font-medium"
          >
            View Profile
          </button>
        </div>
      </div>
    </div>
  )
} 