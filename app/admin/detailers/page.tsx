import { getServerSession } from "next-auth";
import { adminAuthOptions } from "@/app/api/auth-admin/[...nextauth]/route";
import { redirect } from "next/navigation";
import AdminNavbar from "@/app/components/AdminNavbar";
import AdminSessionProvider from "@/app/components/AdminSessionProvider";
import DetailerTableClient from "./DetailerTableClient";
import { prisma } from "@/lib/prisma";

export default async function AdminDetailerListPage() {
  const session = await getServerSession(adminAuthOptions);
  if (!session) {
    redirect("/signin");
  }
  
  // Check if user is admin
  if ((session.user as any)?.role !== 'admin') {
    redirect("/signin");
  }

  // Fetch detailers from the database with all necessary fields
  const detailers = await prisma.detailer.findMany({
    select: {
      id: true,
      businessName: true,
      city: true,
      state: true,
      email: true,
      phone: true,
      priceRange: true,
      description: true,
      images: true,
      detailerImages: true,
      services: {
        include: {
          service: true
        }
      },
      createdAt: true
    },
  });

  return (
    <AdminSessionProvider>
      <AdminNavbar />
      <DetailerTableClient detailers={detailers} />
    </AdminSessionProvider>
  );
} 