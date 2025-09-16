import { prisma } from '@/lib/prisma';
import Navbar from '@/app/components/Navbar';
import SearchResultsClient from './components/SearchResults';
import { MapLoaderProvider } from '@/app/components/MapLoaderProvider';

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
  rating?: number;
  reviewCount?: number;
  badge?: string;
  price?: string;
  driveTime?: string;
<<<<<<< Updated upstream
=======
  hidden?: boolean;
  verified?: boolean;
>>>>>>> Stashed changes
}

interface SearchResultsProps {
  searchParams: {
    lat?: string;
    lng?: string;
    location?: string;
  };
}

export default async function SearchResults(props: SearchResultsProps) {
  const { searchParams } = props;
  const awaitedParams = await searchParams;
  const searchLat = parseFloat(awaitedParams.lat || '42.0834');
  const searchLng = parseFloat(awaitedParams.lng || '-71.0184');
  // Fetch detailers from the database (server-side)
  let detailers = await prisma.detailer.findMany({
    where: {
      hidden: false,
    },
    include: {
      images: {
        select: {
          url: true,
          alt: true
        }
      }
    }
  }) as unknown as Detailer[];

  // Haversine formula to calculate distance in km
  function getDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
    const toRad = (x: number) => x * Math.PI / 180;
    const R = 6371; // Radius of Earth in km
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  detailers = detailers.map(d => ({
    ...d,
    verified: Boolean(d.verified),
    _distance: getDistance(searchLat, searchLng, d.latitude, d.longitude)
  }))
  .sort((a, b) => (a._distance ?? 0) - (b._distance ?? 0));

  return (
    <>
      <Navbar />
      <MapLoaderProvider>
        <SearchResultsClient detailers={detailers} />
      </MapLoaderProvider>
    </>
  );
}