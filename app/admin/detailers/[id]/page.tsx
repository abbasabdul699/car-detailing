import { prisma } from "@/lib/prisma";
import AdminNavbar from '@/app/components/AdminNavbar';
import EditDetailerClient from './EditDetailerClient';

// Force fresh data on each request
export const dynamic = 'force-dynamic';

export default async function EditDetailerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detailer = await prisma.detailer.findUnique({
    where: { id },
    select: {
      id: true,
      businessName: true,
      email: true,
      phone: true,
      twilioPhoneNumber: true,
      smsEnabled: true,
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
      firstName: true,
      lastName: true,
      instagram: true,
      tiktok: true,
      facebook: true,
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

  // Filter images by type
  const profileImage = detailer.images.find(img => img.type === 'profile');
  const portfolioImages = detailer.images.filter(img => img.type === 'portfolio');

  return (
    <div className="edit-detailer-container">
      <AdminNavbar />
      <EditDetailerClient detailer={{
        ...(detailer as any),
        email: detailer.email || '',
        website: detailer.website || '',
        instagram: detailer.instagram || '',
        tiktok: detailer.tiktok || '',
        facebook: detailer.facebook || '',
        twilioPhoneNumber: detailer.twilioPhoneNumber || '',
        smsEnabled: detailer.smsEnabled || false,
        firstName: detailer.firstName || '',
        lastName: detailer.lastName || '',
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
    </div>
  );
} 