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
  PhotoIcon,
  CalendarDaysIcon,
  QuestionMarkCircleIcon,
  StarIcon,
  DocumentTextIcon,
  CubeIcon
} from "@heroicons/react/24/outline";
import DashboardNavbar from "./components/DashboardNavbar";
import { useSession } from "next-auth/react";
import { ThemeProvider } from "@/app/components/ThemeContext";

export default function DetailerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const pathname = usePathname();

  const { data: session } = useSession();
  
  const navigation = [
    { name: "Dashboard", href: "/detailer-dashboard", icon: HomeIcon },
    { name: "Calendar", href: "/detailer-dashboard/calendar", icon: CalendarDaysIcon },
    { name: "Profile", href: "/detailer-dashboard/profile", icon: UserIcon },
    { name: "Services", href: "/detailer-dashboard/services", icon: CalendarIcon },
    { name: "Bundles", href: "/detailer-dashboard/bundles", icon: CubeIcon },
    { name: "Images", href: "/detailer-dashboard/images", icon: PhotoIcon },
    { name: "Reviews", href: "/detailer-dashboard/reviews", icon: StarIcon },
    { name: "Invoices", href: "/detailer-dashboard/invoices", icon: DocumentTextIcon },
    { name: "Calendar Settings", href: "/detailer-dashboard/calendar-settings", icon: CalendarDaysIcon },
    { name: "Settings", href: "/detailer-dashboard/settings", icon: CogIcon },
    { name: "Bookings", href: "/detailer-dashboard/bookings", icon: ChartBarIcon },
  ];

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
    <ThemeProvider>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex">
        {/* Sidebar */}
        <div
          className={`transition-all duration-200 bg-custom-green-900 dark:bg-green-900 border-r border-green-900 dark:border-green-950 flex flex-col h-screen fixed z-30 top-0 left-0 ${
            sidebarOpen ? "w-64" : "w-20"
          }`}
          style={{ minWidth: sidebarOpen ? 256 : 80 }}
        >
          {/* Burger button always at top */}
          <div className="flex items-center h-16 px-4 border-b border-green-700 dark:border-green-800">
            <button
              className={`flex items-center justify-center w-10 h-10 rounded-lg hover:bg-green-700 dark:hover:bg-green-800 transition-all ${sidebarOpen ? "mr-2" : "mx-auto"}`}
              onClick={() => setSidebarOpen((open) => !open)}
              aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            {sidebarOpen && (
              <Link href="/detailer-dashboard" className="text-xl font-bold text-white ml-2">
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
                      ? "bg-black/20 text-white"
                      : "text-gray-200 hover:bg-black/20 hover:text-white"
                  }`}
                >
                  <item.icon
                    className={`mr-3 h-6 w-6 flex-shrink-0 ${
                      isActive ? "text-white" : "text-green-200 dark:text-green-300 group-hover:text-white"
                    }`}
                    aria-hidden="true"
                  />
                  {sidebarOpen && item.name}
                </Link>
              );
            })}
          </nav>
          {/* Help button at bottom */}
          <div className="flex flex-shrink-0 border-t border-green-700 dark:border-green-800 p-4 mt-auto flex-col gap-2">
            <Link
              href="/help-page"
              className={`mt-2 flex items-center justify-center px-2 py-2 text-sm font-semibold rounded-md transition-all ${sidebarOpen ? "bg-green-600 text-white hover:bg-green-700" : "bg-green-600 text-white w-10 h-10 p-0 justify-center"}`}
            >
              <QuestionMarkCircleIcon className="h-6 w-6 mr-2" aria-hidden="true" />
              {sidebarOpen && "Help"}
            </Link>
          </div>
        </div>
        {/* Main content area, with left padding for sidebar */}
        <div className={`flex-1 flex flex-col transition-[padding-left] duration-200 ${sidebarOpen ? "md:pl-64" : "md:pl-20"}`}>
          {/* Dashboard Navbar */}
          <DashboardNavbar onLogout={handleLogout} />
          <main className="flex-1">
            <div className="py-6">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
} 