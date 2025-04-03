import DetailerCard from './components/DetailerCard';
import { prisma } from '@/lib/prisma';
import Navbar from '@/app/components/Navbar';
import MapContainer from './components/MapContainer';

interface DetailerImage {
  url: string;
  alt: string;
}

interface Detailer {
  id: string;
  businessName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  description: string;
  latitude: number;
  longitude: number;
  priceRange: string;
  services: string[];
  images: DetailerImage[];
}

interface SearchResultsProps {
  searchParams: {
    lat?: string;
    lng?: string;
    location?: string;
  };
}

export default async function SearchResults({ searchParams }: SearchResultsProps) {
  // Get the coordinates from search params
  const lat = parseFloat(searchParams.lat || '42.0834');
  const lng = parseFloat(searchParams.lng || '-71.0184');
  const location = searchParams.location || 'you';

  // Fetch detailers from the database
  const detailers = await prisma.detailer.findMany({
    include: {
      images: {
        select: {
          url: true,
          alt: true
        }
      }
    }
  }) as unknown as Detailer[];

  return (
    <>
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">
          Detailers near {location}
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Detailers List */}
          <div className="space-y-4">
            {detailers.map((detailer) => (
              <DetailerCard key={detailer.id} detailer={detailer} />
            ))}
          </div>

          {/* Map */}
          <MapContainer 
            detailers={detailers}
            center={{ lat, lng }}
          />
        </div>
      </main>
    </>
  );
}