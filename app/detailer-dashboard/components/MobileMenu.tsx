"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
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
  HomeIcon,
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

  // Menu items matching Figma design
  // Top items: Calendar, Customers, Messages - 20px font, white
  // Bottom items: Profile, Settings - 16px font, gray (#ababab)
  const topNavigationItems = [
    { name: "Dashboard", href: "/detailer-dashboard", icon: HomeIcon, exact: true },
    { name: "Calendar", href: "/detailer-dashboard/calendar", icon: CalendarDaysIcon },
    { name: "Customers", href: "/detailer-dashboard/customers", icon: UserGroupIcon },
    { name: "Messages", href: "/detailer-dashboard/messages", icon: ChatBubbleLeftRightIcon },
  ];

  const bottomNavigationItems = [
    { name: "Profile", href: "/detailer-dashboard/profile", icon: UserIcon },
    { name: "Settings", href: "/detailer-dashboard/settings", icon: Cog8ToothIcon },
  ];

  const handleLogout = async () => {
    try {
      await signOut({ 
        callbackUrl: "/detailer-login",
        redirect: false // Handle redirect manually to ensure correct destination
      });
      // Manually redirect to detailer login page
      window.location.href = "/detailer-login";
    } catch (error) {
      console.error("Logout failed:", error);
      // Even if signOut fails, redirect to login page
      window.location.href = "/detailer-login";
    }
  };

  return (
    <>
      {/* Hamburger Menu Button - Mobile Only */}
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="md:hidden fixed top-4 left-4 z-[10000] w-8 h-8 flex items-center justify-center rounded-lg transition action-panel-hide event-modal-hide customer-profile-hide messages-chat-hide"
        aria-label="Menu"
      >
        <Bars3Icon className="w-6 h-6 text-gray-700" />
      </button>

      {/* Hamburger Menu - Mobile Only */}
      {isMenuOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-[10001]"
            onClick={() => setIsMenuOpen(false)}
          />
          <div
            ref={menuRef}
            className="md:hidden fixed top-0 left-0 h-full w-80 bg-black shadow-xl z-[10002] transform transition-transform"
          >
            <div className="flex flex-col h-full">
              {/* Close Button - Top Left */}
              <div className="px-6 pt-6 pb-4">
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="w-8 h-8 flex items-center justify-center hover:bg-gray-800 transition rounded-lg"
                  aria-label="Close menu"
                >
                  <XMarkIcon className="w-6 h-6 text-white" />
                </button>
              </div>

              {/* Navigation Items */}
              <div className="flex-1 flex flex-col">
                {/* Top items - 20px font, white text, centered vertically */}
                <div className="flex-1 flex flex-col justify-center px-6">
                  <div style={{ gap: '52px' }} className="flex flex-col">
                    {topNavigationItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = (item as any).exact ? pathname === item.href : pathname.startsWith(item.href);
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={() => setIsMenuOpen(false)}
                          className={`flex items-center gap-3 transition ${
                            isActive
                              ? ""
                              : "text-white hover:opacity-80"
                          }`}
                        >
                          <Icon className="w-6 h-6 flex-shrink-0" style={{ color: isActive ? '#ababab' : 'white' }} />
                          <span 
                            className="font-normal"
                            style={{
                              fontFamily: "'Helvetica Neue', sans-serif",
                              fontSize: '20px',
                              lineHeight: 'normal',
                              color: isActive ? '#ababab' : 'white'
                            }}
                          >
                            {item.name}
                          </span>
                          {isActive && (
                            <div className="ml-auto w-2 h-2 rounded-full bg-white"></div>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom items - 16px font, gray text (#ababab), positioned at bottom left */}
                <div className="px-6 pb-6">
                  <div style={{ gap: '29px' }} className="flex flex-col">
                    {bottomNavigationItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={() => setIsMenuOpen(false)}
                          className={`flex items-center gap-3 transition ${
                            isActive
                              ? "opacity-100"
                              : "hover:opacity-80"
                          }`}
                        >
                          <Icon 
                            className="w-6 h-6 flex-shrink-0" 
                            style={{ color: isActive ? 'white' : '#ababab' }}
                          />
                          <span 
                            className="font-normal"
                            style={{
                              fontFamily: "'Helvetica Neue', sans-serif",
                              fontSize: '16px',
                              lineHeight: 'normal',
                              color: isActive ? 'white' : '#ababab'
                            }}
                          >
                            {item.name}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
