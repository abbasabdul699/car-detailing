import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import Link from "next/link";
import AdminNavbar from "@/app/components/AdminNavbar";

export default async function AdminHomePage() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/api/auth/signin");
  }

  return (
    <>
      <AdminNavbar />
      <div className="max-w-2xl mx-auto py-16">
        <h1 className="text-3xl font-bold mb-8 text-center">Admin Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Link href="/admin/add-detailer" className="block p-8 rounded-xl shadow-lg bg-green-50 hover:bg-green-100 transition text-center">
            <h2 className="text-xl font-semibold mb-2">Add New Detailer</h2>
            <p>Add a new detailer to the platform.</p>
          </Link>
          <Link href="/admin/detailers" className="block p-8 rounded-xl shadow-lg bg-blue-50 hover:bg-blue-100 transition text-center">
            <h2 className="text-xl font-semibold mb-2">View All Detailers</h2>
            <p>See and manage all registered detailers.</p>
          </Link>
        </div>
      </div>
    </>
  );
} 