"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  HomeIcon, 
  UserIcon, 
  CalendarIcon, 
  ChartBarIcon,
  CogIcon,
  ArrowLeftOnRectangleIcon,
  PhotoIcon,
  CalendarDaysIcon,
  QuestionMarkCircleIcon,
  StarIcon,
  DocumentTextIcon
} from "@heroicons/react/24/outline";
import DashboardNavbar from "./components/DashboardNavbar";

const navigation = [
  { name: "Dashboard", href: "/detailer-dashboard", icon: HomeIcon },
  { name: "Calendar", href: "/detailer-dashboard/calendar", icon: CalendarDaysIcon },
  { name: "Profile", href: "/detailer-dashboard/profile", icon: UserIcon },
  { name: "Services", href: "/detailer-dashboard/services", icon: CalendarIcon },
  { name: "Images", href: "/detailer-dashboard/images", icon: PhotoIcon },
  { name: "Reviews", href: "/detailer-dashboard/reviews", icon: StarIcon },
  { name: "Invoices", href: "/detailer-dashboard/invoices", icon: DocumentTextIcon },
  { name: "Settings", href: "/detailer-dashboard/settings", icon: CogIcon },
  { name: "Bookings", href: "/detailer-dashboard/bookings", icon: ChartBarIcon },
];

export default function DetailerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      await fetch("/api/detailer/auth/logout", {
        method: "POST",
      });
      window.location.href = "/detailer-login";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex">
      {/* Sidebar */}
      <div
        className={`transition-all duration-200 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col h-screen fixed z-30 top-0 left-0 ${
          sidebarOpen ? "w-64" : "w-20"
        }`}
        style={{ minWidth: sidebarOpen ? 256 : 80 }}
      >
        {/* Burger button always at top */}
        <div className="flex items-center h-16 px-4 border-b border-gray-100 dark:border-gray-800">
          <button
            className={`flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all ${sidebarOpen ? "mr-2" : "mx-auto"}`}
            onClick={() => setSidebarOpen((open) => !open)}
            aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            <svg className="w-6 h-6 text-gray-500 dark:text-gray-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          {sidebarOpen && (
            <Link href="/detailer-dashboard" className="text-xl font-bold text-teal-900 dark:text-white ml-2">
              Reeva Detailer
            </Link>
          )}
        </div>
        {/* Navigation */}
        <nav className="flex-1 mt-4 space-y-1 px-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-all ${
                  isActive
                    ? "bg-indigo-50 dark:bg-gray-800 text-teal-600 dark:text-teal-400"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-teal-900 dark:hover:text-white"
                }`}
              >
                <item.icon
                  className={`mr-3 h-6 w-6 flex-shrink-0 ${
                    isActive ? "text-teal-600 dark:text-teal-400" : "text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-300"
                  }`}
                  aria-hidden="true"
                />
                {sidebarOpen && item.name}
              </Link>
            );
          })}
        </nav>
        {/* Logout at bottom */}
        <div className="flex flex-shrink-0 border-t border-gray-200 dark:border-gray-800 p-4 mt-auto flex-col gap-2">
        <Link
            href="/help-page"
            className={`mt-2 flex items-center justify-center px-2 py-2 text-sm font-semibold rounded-md transition-all ${sidebarOpen ? "bg-teal-600 text-white hover:bg-teal-700" : "bg-teal-600 text-white w-10 h-10 p-0 justify-center"}`}
          >
            <QuestionMarkCircleIcon className="h-6 w-6 mr-2" aria-hidden="true" />
            {sidebarOpen && "Help"}
          </Link>
          <button
            onClick={handleLogout}
            className={`group flex w-full items-center px-2 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-teal-900 dark:hover:text-white rounded-md ${sidebarOpen ? "" : "justify-center"}`}
          >
            <ArrowLeftOnRectangleIcon
              className="mr-3 h-6 w-6 text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-300"
              aria-hidden="true"
            />
            {sidebarOpen && "Logout"}
          </button>
        </div>
      </div>
      {/* Main content area, with left padding for sidebar */}
      <div className={`flex-1 flex flex-col transition-all duration-200 ${sidebarOpen ? "md:pl-64" : "md:pl-20"}`}>
        {/* Dashboard Navbar */}
        <DashboardNavbar />
        <main className="flex-1">
          <div className="py-6">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
} 