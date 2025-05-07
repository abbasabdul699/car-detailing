"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";

export default function AdminNavbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-[#0A2217]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="text-2xl font-bold text-white">
            Reeva
          </Link>
          {/* Right: Home and Logout */}
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="text-white font-semibold px-3 py-1 rounded hover:bg-green-800 transition"
            >
              Home
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/api/auth/signin" })}
              className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
} 