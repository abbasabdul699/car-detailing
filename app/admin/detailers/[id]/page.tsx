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
      imageUrl: true,
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
      hidden: true,
      googlePlaceId: true,
      instagram: true,
      tiktok: true,
      facebook: true,
    },
  });

  if (!detailer) {
    return <div>Detailer not found</div>;
  }

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
        imageUrl: detailer.imageUrl || undefined,
        images: Array.isArray(detailer.images) ? detailer.images.map((img: any) => ({
          ...img,
          type: img.type || undefined
        })) : [],
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