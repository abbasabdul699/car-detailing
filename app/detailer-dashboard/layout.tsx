"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { 
  Cog8ToothIcon,
  ArrowLeftStartOnRectangleIcon,
  UserCircleIcon,
  PhotoIcon,
  CreditCardIcon,
  BookOpenIcon
} from "@heroicons/react/24/outline";
import MobileMenu from "./components/MobileMenu";
import { useSession, signOut } from "next-auth/react";
import { ThemeProvider } from "@/app/components/ThemeContext";
import DetailerSessionProvider from "@/app/components/DetailerSessionProvider";

function DetailerDashboardLayoutInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownMenuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ left: 0, bottom: 0 });

  const { data: session } = useSession();

  // Ensure component is mounted before using portal
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      // Check if click is outside both the button container and the dropdown menu
      const isOutsideButton = dropdownRef.current && !dropdownRef.current.contains(target);
      const isOutsideDropdown = dropdownMenuRef.current && !dropdownMenuRef.current.contains(target);
      
      if (isOutsideButton && isOutsideDropdown) {
        setDropdownOpen(false);
      }
    };
    
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownOpen]);

  // Calculate dropdown position when it opens
  useEffect(() => {
    if (dropdownOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        left: rect.left,
        bottom: window.innerHeight - rect.top
      });
    }
  }, [dropdownOpen]);
  
  const navigation = [
    { name: "Calendar", href: "/detailer-dashboard/calendar", iconPath: "/icons/calendar (1).png" },
    { name: "Customer", href: "/detailer-dashboard/customers", iconPath: "/icons/book-alt (1).png" },
    { name: "Conversation", href: "/detailer-dashboard/messages", iconPath: "/icons/messages (1).png" },
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
    <ThemeProvider>
      <div className="detailer-dashboard-border-overlay"></div>
      <div className="h-screen bg-white flex overflow-hidden w-full max-w-full">
          {/* Sidebar */}
          <div
            className={`hidden md:flex flex-col h-screen md:fixed md:top-0 md:left-0 transition-[width] duration-200 ease-out ${isSidebarHovered ? 'w-56' : 'w-16'}`}
            style={{ backgroundColor: '#F8F8F7', zIndex: 10, borderRight: '1px solid #E2E2DD', boxShadow: 'none' }}
            onMouseEnter={() => setIsSidebarHovered(true)}
            onMouseLeave={() => setIsSidebarHovered(false)}
          >
          {/* Logo at top */}
          <div className={`flex items-center h-16 pt-2 ${isSidebarHovered ? 'justify-start px-4' : 'justify-center px-2'}`}>
            <Link href="/detailer-dashboard" className="flex items-center justify-center w-12 h-12 bg-black rounded-full overflow-hidden shrink-0">
              <Image 
                src="/REEVA LOGO.png" 
                alt="Reeva Logo" 
                width={32} 
                height={32}
                className="object-contain"
              />
            </Link>
            <span
              className={`text-sm font-semibold whitespace-nowrap overflow-hidden transition-all duration-200 ${
                isSidebarHovered ? 'ml-3 opacity-100 max-w-[140px]' : 'ml-0 opacity-0 max-w-0'
              }`}
            >
              Reeva
            </span>
          </div>
          
          {/* Navigation - icon only, square style, centered vertically */}
          <nav className={`flex-1 flex flex-col justify-center space-y-2 ${isSidebarHovered ? 'items-stretch px-3' : 'items-center'}`}>
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center transition-all ${
                    isActive
                      ? "text-gray-900"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  } ${isSidebarHovered ? 'w-full px-3 py-2 rounded-xl justify-start' : 'flex-col items-center justify-center'}`}
                  style={isActive ? { backgroundColor: 'transparent' } : {}}
                  title={item.name}
                >
                  <div 
                    className={`flex items-center justify-center w-12 h-12 rounded-full transition-all ${
                      isActive ? "" : ""
                    }`}
                    style={isActive ? { backgroundColor: '#E2E2DD' } : {}}
                  >
                    <Image
                      src={item.iconPath}
                      alt={item.name}
                      width={20}
                      height={20}
                      className={`object-contain transition-opacity ${
                        isActive
                          ? "opacity-100"
                          : "opacity-75 group-hover:opacity-85"
                      }`}
                    />
                  </div>
                  <span
                    className={`ml-3 text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-200 ${
                      isSidebarHovered ? 'opacity-100 max-w-[140px]' : 'opacity-0 max-w-0'
                    }`}
                  >
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </nav>
          
          {/* Profile dropdown at bottom */}
          <div className={`flex flex-shrink-0 p-4 flex-col space-y-3 relative ${isSidebarHovered ? 'items-stretch' : 'items-center'}`} ref={dropdownRef}>
            {/* Resources button */}
            <Link
              href="/detailer-dashboard/resources"
              className={`flex items-center text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all focus:outline-none ${isSidebarHovered ? 'w-full px-3 py-2 rounded-xl justify-start' : ''}`}
              title="Resources"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-full">
                <Image 
                  src="/icons/users-alt-3.png" 
                  alt="Resources" 
                  width={24} 
                  height={24}
                  className="opacity-75"
                />
              </div>
              <span
                className={`ml-3 text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-200 ${
                  isSidebarHovered ? 'opacity-100 max-w-[140px]' : 'opacity-0 max-w-0'
                }`}
              >
                Resources
              </span>
            </Link>
            
            {/* Profile image button */}
            <div className={`flex items-center ${isSidebarHovered ? 'w-full px-3 py-2 rounded-xl hover:bg-gray-100' : ''}`}>
              <button
                ref={buttonRef}
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center justify-center w-10 h-10 rounded-full overflow-hidden bg-gray-200 hover:bg-gray-300 transition-all focus:outline-none relative z-50"
                title="Profile"
              >
                <img
                  className="w-full h-full object-cover"
                  src={session?.user?.image || '/images/default-avatar.png'}
                  alt="User avatar"
                />
              </button>
              <span
                className={`ml-3 text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-200 ${
                  isSidebarHovered ? 'opacity-100 max-w-[140px]' : 'opacity-0 max-w-0'
                }`}
              >
                Profile
              </span>
            </div>

            {/* Dropdown menu - rendered via portal to escape all overflow containers */}
            {dropdownOpen && mounted && createPortal(
              <div 
                ref={dropdownMenuRef}
                className="fixed w-56 origin-bottom-left rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-[9999]"
                style={{
                  left: `${dropdownPosition.left}px`,
                  bottom: `${dropdownPosition.bottom}px`
                }}
              >
                <div className="py-1">
                  <div className="px-4 py-3 border-b border-gray-200 flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-full overflow-hidden flex-shrink-0">
                      <img className="w-full h-full object-cover" src={session?.user?.image || '/images/default-avatar.png'} alt="User avatar" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{session?.user?.businessName || session?.user?.name}</p>
                      <p className="text-sm text-gray-500 truncate">{session?.user?.name}</p>
                    </div>
                  </div>
                  <Link 
                    href="/detailer-dashboard/profile" 
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <UserCircleIcon className="mr-3 h-5 w-5 text-gray-400" />
                    Edit profile
                  </Link>
                  <Link 
                    href="/detailer-dashboard/settings" 
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <Cog8ToothIcon className="mr-3 h-5 w-5 text-gray-400" />
                    Settings
                  </Link>
                  <Link 
                    href="/detailer-dashboard/services" 
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <div className="mr-3 flex items-center justify-center">
                      <Image 
                        src="/icons/Customer.svg" 
                        alt="Services" 
                        width={20} 
                        height={20}
                        className="opacity-60"
                        style={{ filter: 'grayscale(100%) brightness(0.6)' }}
                      />
                    </div>
                    Services
                  </Link>
                  <Link 
                    href="/detailer-dashboard/images" 
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <PhotoIcon className="mr-3 h-5 w-5 text-gray-400" />
                    Manage images
                  </Link>
                  <Link 
                    href="/detailer-dashboard/subscription" 
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <CreditCardIcon className="mr-3 h-5 w-5 text-gray-400" />
                    Subscription
                  </Link>
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      handleLogout();
                    }}
                    className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <ArrowLeftStartOnRectangleIcon className="mr-3 h-5 w-5 text-gray-400" />
                    Sign out
                  </button>
                </div>
              </div>,
              document.body
            )}
          </div>
        </div>
        {/* Main content area, with left padding for sidebar */}
        <div
          className={`flex-1 flex flex-col min-w-0 overflow-hidden transition-[margin] duration-200 ease-out ${isSidebarHovered ? 'md:ml-56' : 'md:ml-16'}`}
        >
          {/* Mobile Hamburger Menu */}
          <MobileMenu />
          <main className="flex-1 min-w-0 overflow-hidden" style={{ backgroundColor: '#ffffff' }}>
            <div className="h-full min-w-0 overflow-hidden">
              <div className="h-full min-w-0 overflow-hidden">
                {/* content wrapper */}
                <div className="bg-white h-full flex flex-col min-w-0 overflow-hidden">
                  {children}
                </div>
              </div>
            </div>
          </main>
        </div>
        
      </div>
    </ThemeProvider>
  );
}

export default function DetailerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DetailerSessionProvider>
      <DetailerDashboardLayoutInner>{children}</DetailerDashboardLayoutInner>
    </DetailerSessionProvider>
  );
}
