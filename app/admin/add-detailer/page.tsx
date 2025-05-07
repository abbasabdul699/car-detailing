import React from 'react';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import DetailerForm from '@/app/components/DetailerForm';
import AdminNavbar from '@/app/components/AdminNavbar';

export default async function AddDetailerPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/api/auth/signin");
  }

  if (!session.user || (session.user as any).role !== "admin") {
    return <div className="text-center text-red-600 mt-10">Unauthorized: Admins only.</div>;
  }

  return (
    <>
      <AdminNavbar />
      <div className="max-w-2xl mx-auto py-10">
        <h1 className="text-2xl font-bold mb-6">Add New Detailer</h1>
        <div className="border rounded p-6 bg-white shadow">
          <DetailerForm />
        </div>
      </div>
    </>
  );
} 