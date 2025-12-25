"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { XMarkIcon, Bars3Icon, ArrowLeftStartOnRectangleIcon } from "@heroicons/react/24/outline";
import {
  UsersIcon,
  ChatBubbleLeftRightIcon,
  CalendarDaysIcon,
  UserIcon,
  CubeIcon,
  PhotoIcon,
  CreditCardIcon,
  Cog8ToothIcon,
  QuestionMarkCircleIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";

export default function MobileMenu() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  // Track scroll position to add background to hamburger button
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      setIsScrolled(scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navigationItems = [
    { name: "Calendar", href: "/detailer-dashboard/calendar", icon: CalendarDaysIcon },
    { name: "Resources", href: "/detailer-dashboard/resources", icon: UsersIcon },
    { name: "Messages", href: "/detailer-dashboard/messages", icon: ChatBubbleLeftRightIcon },
    { name: "Customers", href: "/detailer-dashboard/customers", icon: UserGroupIcon },
    { name: "Profile", href: "/detailer-dashboard/profile", icon: UserIcon },
  ];

  const additionalItems = [
    { name: "Services", href: "/detailer-dashboard/services", icon: CubeIcon },
    { name: "Manage Images", href: "/detailer-dashboard/images?upload=1", icon: PhotoIcon },
    { name: "Subscription", href: "/detailer-dashboard/subscription", icon: CreditCardIcon },
    { name: "Settings", href: "/detailer-dashboard/settings", icon: Cog8ToothIcon },
    { name: "Help & Support", href: "/help-page", icon: QuestionMarkCircleIcon },
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
    <>
      {/* Hamburger Menu Button - Mobile Only */}
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className={`md:hidden fixed top-4 left-4 z-50 w-8 h-8 flex items-center justify-center rounded-lg transition action-panel-hide ${
          isScrolled 
            ? 'bg-white shadow-sm' 
            : 'hover:bg-gray-50'
        }`}
        aria-label="Menu"
      >
        <Bars3Icon className="w-6 h-6 text-gray-700" />
      </button>

      {/* Hamburger Menu - Mobile Only */}
      {isMenuOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={() => setIsMenuOpen(false)}
          />
          <div
            ref={menuRef}
            className="md:hidden fixed top-0 left-0 h-full w-80 bg-white shadow-xl z-50 transform transition-transform"
          >
            <div className="flex flex-col h-full">
              {/* Menu Header */}
              <div className="px-4 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition"
                  aria-label="Close menu"
                >
                  <XMarkIcon className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {/* Navigation Items */}
              <div className="flex-1 overflow-y-auto py-4">
                <div className="space-y-1 px-2">
                  {navigationItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setIsMenuOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                          isActive
                            ? "bg-gray-100 text-gray-900"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        <Icon className="w-5 h-5 text-gray-500" />
                        <span className="font-medium">{item.name}</span>
                      </Link>
                    );
                  })}
                </div>

                {/* Divider */}
                <div className="my-4 px-2">
                  <div className="border-t border-gray-200" />
                </div>

                {/* Additional Actions */}
                <div className="space-y-1 px-2">
                  {additionalItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 transition text-gray-700"
                      >
                        <Icon className="w-5 h-5 text-gray-500" />
                        <span className="font-medium">{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Sign Out Button */}
              <div className="flex-shrink-0 px-2 pb-4 pt-2 border-t border-gray-200">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 transition text-gray-700"
                >
                  <ArrowLeftStartOnRectangleIcon className="w-5 h-5 text-gray-500" />
                  <span className="font-medium">Sign out</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

