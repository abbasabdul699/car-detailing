"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { 
  QuestionMarkCircleIcon,
  Cog8ToothIcon,
  ArrowLeftStartOnRectangleIcon,
  UserCircleIcon,
  PhotoIcon,
  CreditCardIcon,
  BookOpenIcon
} from "@heroicons/react/24/outline";
import MobileMenu from "./components/MobileMenu";
import { useSession } from "next-auth/react";
import { ThemeProvider } from "@/app/components/ThemeContext";
import PlanSelectionModal from "@/app/components/PlanSelectionModal";
import { usePlanSelection } from "@/app/hooks/usePlanSelection";

export default function DetailerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
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
  
  // Plan selection logic
  const {
    showPlanSelection,
    plans,
    isLoading,
    error,
    handleSelectPlan,
    closePlanSelection,
  } = usePlanSelection();
  
  const navigation = [
    { name: "Calendar", href: "/detailer-dashboard/calendar", iconPath: "/icons/calendar (1).png" },
    { name: "Customer", href: "/detailer-dashboard/customers", iconPath: "/icons/book-alt (1).png" },
    { name: "Conversation", href: "/detailer-dashboard/messages", iconPath: "/icons/messages (1).png" },
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
      <div className="detailer-dashboard-border-overlay"></div>
      <div className="min-h-screen bg-white dark:bg-gray-950 flex overflow-hidden w-full max-w-full">
          {/* Sidebar */}
          <div className="hidden md:flex w-16 flex-col h-screen md:fixed md:top-0 md:left-0" style={{ backgroundColor: '#F8F8F7', zIndex: 10, borderRight: '1px solid #E2E2DD', boxShadow: 'none' }}>
          {/* Logo at top */}
          <div className="flex items-center justify-center h-16 px-2 pt-2">
            <Link href="/detailer-dashboard" className="flex items-center justify-center w-12 h-12 bg-black rounded-full overflow-hidden">
              <Image 
                src="/REEVA LOGO.png" 
                alt="Reeva Logo" 
                width={32} 
                height={32}
                className="object-contain"
              />
            </Link>
          </div>
          
          {/* Navigation - icon only, square style, centered vertically */}
          <nav className="flex-1 flex flex-col items-center justify-center space-y-3">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex flex-col items-center justify-center transition-all ${
                    isActive
                      ? "text-gray-900"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
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
                  <span className="text-[10px] mt-1 font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>
          
          {/* Profile dropdown at bottom */}
          <div className="flex flex-shrink-0 p-4 flex-col items-center space-y-3 relative" ref={dropdownRef}>
            {/* Support button */}
            <Link
              href="/help-page"
              className="flex flex-col items-center justify-center text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all focus:outline-none"
              title="Support"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-full">
                <QuestionMarkCircleIcon className="w-6 h-6" aria-hidden="true" />
              </div>
          
            </Link>
            
            {/* Settings button */}
            <Link
              href="/detailer-dashboard/settings"
              className="flex flex-col items-center justify-center text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all focus:outline-none"
              title="Settings"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-full">
                <Cog8ToothIcon className="w-6 h-6" aria-hidden="true" />
              </div>
            </Link>
            
            {/* Profile image button */}
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

            {/* Dropdown menu - rendered via portal to escape all overflow containers */}
            {dropdownOpen && mounted && createPortal(
              <div 
                ref={dropdownMenuRef}
                className="fixed w-56 origin-bottom-left rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-[9999]"
                style={{
                  left: `${dropdownPosition.left}px`,
                  bottom: `${dropdownPosition.bottom}px`
                }}
              >
                <div className="py-1">
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-full overflow-hidden flex-shrink-0">
                      <img className="w-full h-full object-cover" src={session?.user?.image || '/images/default-avatar.png'} alt="User avatar" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{session?.user?.businessName || session?.user?.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{session?.user?.name}</p>
                    </div>
                  </div>
                  <Link 
                    href="/detailer-dashboard/profile" 
                    className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <UserCircleIcon className="mr-3 h-5 w-5 text-gray-400" />
                    Edit profile
                  </Link>
                  <Link 
                    href="/detailer-dashboard/resources" 
                    className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <div className="mr-3 flex items-center justify-center">
                      <Image 
                        src="/icons/users-alt-3.png" 
                        alt="Resources" 
                        width={20} 
                        height={20}
                        className="opacity-60"
                        style={{ filter: 'grayscale(100%) brightness(0.6)' }}
                      />
                    </div>
                    Resources
                  </Link>
                  <Link 
                    href="/detailer-dashboard/services" 
                    className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
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
                    className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <PhotoIcon className="mr-3 h-5 w-5 text-gray-400" />
                    Manage images
                  </Link>
                  <Link 
                    href="/detailer-dashboard/subscription" 
                    className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
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
                    className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
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
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden md:ml-16">
          {/* Mobile Hamburger Menu */}
          <MobileMenu />
          <main className="flex-1 min-w-0 overflow-hidden" style={{ backgroundColor: '#ffffff' }}>
            <div className="h-full min-w-0 overflow-hidden">
              <div className="h-full min-w-0 overflow-hidden">
                {/* content wrapper */}
                <div className="bg-white dark:bg-gray-800 h-full flex flex-col min-w-0 overflow-hidden">
                  {children}
                </div>
              </div>
            </div>
          </main>
        </div>
        
        {/* Plan Selection Modal */}
        <PlanSelectionModal
          isOpen={showPlanSelection}
          onClose={closePlanSelection}
          onSelectPlan={handleSelectPlan}
          plans={plans}
          isLoading={isLoading}
        />
      </div>
    </ThemeProvider>
  );
} 