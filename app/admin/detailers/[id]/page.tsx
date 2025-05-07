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
      images: true,
      detailerImages: true,
      services: {
        include: {
          service: {
            select: {
              id: true,
              name: true,
              category: true
            }
          }
        }
      },
    },
  });

  if (!detailer) {
    return <div>Detailer not found</div>;
  }

  return (
    <div className="edit-detailer-container">
      <AdminNavbar />
      <EditDetailerClient detailer={detailer} />
    </div>
  );
} 