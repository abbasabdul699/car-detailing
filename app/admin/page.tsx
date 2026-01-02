import { getServerSession } from "next-auth";
import { adminAuthOptions } from "@/app/api/auth-admin/[...nextauth]/route";
import { redirect } from "next/navigation";
import Link from "next/link";
import AdminNavbar from "@/app/components/AdminNavbar";
import AdminSessionProvider from "@/app/components/AdminSessionProvider";

export default async function AdminHomePage() {
  const session = await getServerSession(adminAuthOptions);
  if (!session) {
    redirect("/signin");
  }
  
  // Check if user is admin
  if ((session.user as any)?.role !== 'admin') {
    redirect("/signin");
  }

  return (
    <AdminSessionProvider>
      <AdminNavbar />
      <div className="max-w-2xl mx-auto py-16">
        <h1 className="text-3xl font-bold mb-8 text-center">Admin Dashboard</h1>
        <div className="flex flex-col items-center gap-8">
          <div className="flex flex-row gap-8">
            <div className="bg-green-50 rounded-2xl shadow-lg p-10 w-96 flex flex-col items-center justify-center">
              <h2 className="text-2xl font-bold mb-2">Add New Detailer</h2>
              <p className="text-lg text-center mb-4">Add a new detailer to the platform.</p>
              <Link href="/admin/add-detailer" className="px-6 py-2 bg-green-700 text-white rounded-xl font-semibold hover:bg-green-800 transition">Add Detailer</Link>
            </div>
            <div className="bg-blue-50 rounded-2xl shadow-lg p-10 w-96 flex flex-col items-center justify-center">
              <h2 className="text-2xl font-bold mb-2">View All Detailers</h2>
              <p className="text-lg text-center mb-4">See and manage all registered detailers.</p>
              <Link href="/admin/detailers" className="px-6 py-2 bg-blue-700 text-white rounded-xl font-semibold hover:bg-blue-800 transition">View Detailers</Link>
            </div>
          </div>
          <div className="flex flex-row gap-8">
            <div className="bg-yellow-50 rounded-2xl shadow-lg p-10 w-96 flex flex-col items-center justify-center">
              <h2 className="text-2xl font-bold mb-2">Manage Services</h2>
              <p className="text-lg text-center mb-4">Add, edit, or remove car detailing services and icons.</p>
              <Link href="/admin/services" className="px-6 py-2 bg-yellow-500 text-white rounded-xl font-semibold hover:bg-yellow-600 transition">Manage Services</Link>
            </div>
            <div className="bg-purple-50 rounded-2xl shadow-lg p-10 w-96 flex flex-col items-center justify-center">
              <h2 className="text-2xl font-bold mb-2">Customer Database</h2>
              <p className="text-lg text-center mb-4">View and manage customer contact information and preferences.</p>
              <Link href="/admin/customers" className="px-6 py-2 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition">View Customers</Link>
            </div>
          </div>
        </div>
      </div>
    </AdminSessionProvider>
  );
} 