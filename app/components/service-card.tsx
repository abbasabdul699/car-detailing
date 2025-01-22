import Image from "next/image"
import { Star } from "lucide-react"

interface ServiceCardProps {
  title: string
  rating: number
  imageUrl: string
}

export function ServiceCard({ title, rating, imageUrl }: ServiceCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden bg-white">
      <div className="relative h-48">
        <Image src={imageUrl || "/placeholder.svg"} alt={title} fill className="object-cover" />
      </div>
      <div className="p-4">
        <h3 className="font-medium mb-2">{title}</h3>
        <div className="flex gap-1">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`h-5 w-5 ${i < rating ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

