import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import AdminNavbar from "@/app/components/AdminNavbar";
import DetailerTableClient from "./DetailerTableClient";
import { prisma } from "@/lib/prisma";

export default async function AdminDetailerListPage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/api/auth/signin");
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
    <>
      <AdminNavbar />
      <DetailerTableClient detailers={detailers} />
    </>
  );
} 