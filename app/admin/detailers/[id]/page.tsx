import { prisma } from "@/lib/prisma";
import AdminNavbar from '@/app/components/AdminNavbar';
import EditDetailerClient from './EditDetailerClient';

export default async function EditDetailerPage({ params }: { params: { id: string } }) {
  const detailer = await prisma.detailer.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      businessName: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      address: true,
      city: true,
      state: true,
      zipCode: true,
      description: true,
      latitude: true,
      longitude: true,
      priceRange: true,
      website: true,
      businessHours: true,
      images: true,
      detailerImages: true,
      services: {
        include: {
          service: {
            select: {
              id: true,
              name: true,
              category: { select: { name: true } }
            }
          }
        }
      },
      verified: true,
      hidden: true
    },
  });

  if (!detailer) {
    return <div>Detailer not found</div>;
  }

<<<<<<< Updated upstream
  // Transform the detailer object to match the client component's expected props
  const transformedDetailer = {
    ...detailer,
    email: detailer.email || '',
    website: detailer.website || '',
    services: detailer.services.map(s => ({
      ...s,
      service: {
        ...s.service,
        category: s.service.category?.name
      }
    }))
  };
=======
  // Filter images by type
  const profileImage = detailer.images.find(img => img.type === 'profile');
  const portfolioImages = detailer.images.filter(img => img.type === 'portfolio');
>>>>>>> Stashed changes

  return (
    <div className="edit-detailer-container">
      <AdminNavbar />
<<<<<<< Updated upstream
      <EditDetailerClient detailer={transformedDetailer} />
=======
      <EditDetailerClient detailer={{
        ...(detailer as any),
        email: detailer.email || '',
        website: detailer.website || '',
        instagram: detailer.instagram || '',
        tiktok: detailer.tiktok || '',
        facebook: detailer.facebook || '',
        profileImage: profileImage ? { url: profileImage.url, alt: profileImage.alt || '', type: 'profile' } : undefined,
        portfolioImages: portfolioImages.map((img: any) => ({
          id: img.id,
          url: img.url,
          alt: img.alt || '',
          type: 'portfolio',
        })),
        detailerImages: Array.isArray(detailer.detailerImages) ? detailer.detailerImages.map((img: any) => ({
          id: img.id,
          url: img.url,
          alt: img.alt,
        })) : [],
        services: Array.isArray(detailer.services) ? detailer.services.map((ds: any) => ({
          service: {
            id: ds.service.id,
            name: ds.service.name,
            category: ds.service.category?.name || undefined
          }
        })) : [],
        googlePlaceId: detailer.googlePlaceId || undefined,
      }} />
>>>>>>> Stashed changes
    </div>
  );
} 