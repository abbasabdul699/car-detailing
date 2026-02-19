"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { 
  Cog8ToothIcon,
  ArrowLeftStartOnRectangleIcon,
  UserCircleIcon,
  PhotoIcon,
  CreditCardIcon,
  BookOpenIcon
} from "@heroicons/react/24/outline";
import { Home, Calendar as CalendarIcon, Inbox, Users, Target } from "lucide-react";
import MobileMenu from "./components/MobileMenu";
import OnboardingOverlay from "./components/OnboardingOverlay";
import { useSession, signOut } from "next-auth/react";
import { ThemeProvider } from "@/app/components/ThemeContext";
import DetailerSessionProvider from "@/app/components/DetailerSessionProvider";

function DetailerDashboardLayoutInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownMenuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ left: 0, bottom: 0 });

  const { data: session, status: sessionStatus } = useSession();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  // Ensure component is mounted before using portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Listen for custom event to open onboarding survey from any child page
  useEffect(() => {
    const handler = () => setShowOnboarding(true);
    window.addEventListener("open-onboarding-survey", handler);
    return () => window.removeEventListener("open-onboarding-survey", handler);
  }, []);

  // Check onboarding status when session is ready
  useEffect(() => {
    if (sessionStatus !== "authenticated" || onboardingChecked) return;
    setOnboardingChecked(true);

    // Try the dedicated onboarding endpoint first, fall back to customer count check
    fetch("/api/detailer/onboarding")
      .then((res) => {
        if (!res.ok) throw new Error(`Onboarding API returned ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (data.needsOnboarding) {
          setShowOnboarding(true);
        }
      })
      .catch((err) => {
        console.warn("[onboarding] Primary check failed, trying fallback:", err.message);
        // Fallback: check customer count directly
        fetch("/api/detailer/customers")
          .then((res) => {
            if (!res.ok) return null;
            return res.json();
          })
          .then((data) => {
            if (data && Array.isArray(data.customers) && data.customers.length === 0) {
              setShowOnboarding(true);
            }
          })
          .catch(() => {});
      });
  }, [sessionStatus, onboardingChecked]);

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
    { name: "Home", href: "/detailer-dashboard", icon: Home, exact: true },
    { name: "Calendar", href: "/detailer-dashboard/calendar", icon: CalendarIcon },
    { name: "Conversation", href: "/detailer-dashboard/messages", icon: Inbox },
    { name: "Follow-ups", href: "/detailer-dashboard/followups", icon: Target },
    { name: "Customer", href: "/detailer-dashboard/customers", icon: Users },
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
      <div className="h-dvh bg-white flex overflow-hidden w-full max-w-full">
          {/* Sidebar */}
          <div
            className={`hidden md:flex flex-col h-dvh md:fixed md:top-0 md:left-0 transition-[width] duration-200 ease-out ${isSidebarHovered ? 'w-56' : 'w-16'}`}
            style={{ backgroundColor: '#F8F8F7', zIndex: 200, borderRight: '1px solid #E2E2DD', boxShadow: 'none' }}
            onMouseEnter={() => setIsSidebarHovered(true)}
            onMouseLeave={() => setIsSidebarHovered(false)}
          >
          {/* Logo at top */}
          <div className={`flex items-center h-16 pt-2 ${isSidebarHovered ? 'justify-start px-4' : 'justify-center px-2'}`}>
            <Link href="/detailer-dashboard" className="flex items-center justify-center w-10 h-10 rounded-full overflow-hidden shrink-0">
              <Image 
                src="/REEVA LOGO.png" 
                alt="Reeva Logo" 
                width={80} 
                height={80}
                className="object-cover w-full h-full"
              />
            </Link>
            <span
              className={`text-sm font-semibold whitespace-nowrap overflow-hidden transition-all duration-200 ${
                isSidebarHovered ? 'ml-3 opacity-100 max-w-[140px]' : 'ml-0 opacity-0 max-w-0'
              }`}
            >
              Carbon
            </span>
          </div>
          
          {/* Navigation - icon only, square style, centered vertically */}
          <nav className={`flex-1 flex flex-col justify-center space-y-2 ${isSidebarHovered ? 'items-stretch px-3' : 'items-center'}`}>
            {navigation.map((item) => {
              const isActive = (item as any).exact ? pathname === item.href : pathname === item.href;
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
                    <item.icon
                      className={`w-5 h-5 transition-opacity ${
                        isActive
                          ? "opacity-100"
                          : "opacity-75 group-hover:opacity-85"
                      }`}
                      strokeWidth={1.75}
                    />
                  </div>
                  <span
                    className={`ml-3 text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-200 flex items-center gap-1.5 ${
                      isSidebarHovered ? 'opacity-100 max-w-[180px]' : 'opacity-0 max-w-0'
                    }`}
                  >
                    {item.name}
                    {item.name === "Follow-ups" && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600 leading-none">BETA</span>
                    )}
                  </span>
                </Link>
              );
            })}
          </nav>
          
          {/* Profile dropdown at bottom */}
          <div className={`flex flex-shrink-0 p-4 flex-col space-y-3 relative ${isSidebarHovered ? 'items-stretch' : 'items-center'}`} ref={dropdownRef}>
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
                className="fixed w-60 origin-bottom-left rounded-2xl bg-white shadow-[0_8px_30px_rgba(0,0,0,0.08)] border border-gray-100 focus:outline-none z-[9999] overflow-hidden"
                style={{
                  left: `${dropdownPosition.left}px`,
                  bottom: `${dropdownPosition.bottom}px`
                }}
              >
                <div className="px-4 py-4 border-b border-gray-100 flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-gray-100">
                    <img className="w-full h-full object-cover" src={session?.user?.image || '/images/default-avatar.png'} alt="User avatar" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{session?.user?.businessName || session?.user?.name}</p>
                    <p className="text-xs text-gray-400 truncate">{session?.user?.name}</p>
                  </div>
                </div>
                <div className="py-2 px-2">
                  <Link 
                    href="/detailer-dashboard/profile" 
                    className="flex items-center px-3 py-2.5 text-[13px] text-gray-600 hover:bg-[#f6f5f2] rounded-xl transition-colors"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <UserCircleIcon className="mr-3 h-[18px] w-[18px] text-gray-400" />
                    Edit profile
                  </Link>
                  <Link 
                    href="/detailer-dashboard/settings" 
                    className="flex items-center px-3 py-2.5 text-[13px] text-gray-600 hover:bg-[#f6f5f2] rounded-xl transition-colors"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <Cog8ToothIcon className="mr-3 h-[18px] w-[18px] text-gray-400" />
                    Settings
                  </Link>
                  <Link 
                    href="/detailer-dashboard/services" 
                    className="flex items-center px-3 py-2.5 text-[13px] text-gray-600 hover:bg-[#f6f5f2] rounded-xl transition-colors"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <div className="mr-3 flex items-center justify-center">
                      <Image 
                        src="/icons/Customer.svg" 
                        alt="Services" 
                        width={18} 
                        height={18}
                        className="opacity-50"
                        style={{ filter: 'grayscale(100%) brightness(0.6)' }}
                      />
                    </div>
                    Services
                  </Link>
                  <Link 
                    href="/detailer-dashboard/images" 
                    className="flex items-center px-3 py-2.5 text-[13px] text-gray-600 hover:bg-[#f6f5f2] rounded-xl transition-colors"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <PhotoIcon className="mr-3 h-[18px] w-[18px] text-gray-400" />
                    Manage images
                  </Link>
                  <Link 
                    href="/detailer-dashboard/subscription" 
                    className="flex items-center px-3 py-2.5 text-[13px] text-gray-600 hover:bg-[#f6f5f2] rounded-xl transition-colors"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <CreditCardIcon className="mr-3 h-[18px] w-[18px] text-gray-400" />
                    Subscription
                  </Link>
                  <Link 
                    href="/detailer-dashboard/resources" 
                    className="flex items-center px-3 py-2.5 text-[13px] text-gray-600 hover:bg-[#f6f5f2] rounded-xl transition-colors"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <BookOpenIcon className="mr-3 h-[18px] w-[18px] text-gray-400" />
                    Resources
                  </Link>
                </div>
                <div className="border-t border-gray-100 py-2 px-2">
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      handleLogout();
                    }}
                    className="w-full text-left flex items-center px-3 py-2.5 text-[13px] text-gray-600 hover:bg-[#f6f5f2] rounded-xl transition-colors"
                  >
                    <ArrowLeftStartOnRectangleIcon className="mr-3 h-[18px] w-[18px] text-gray-400" />
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
          className={`flex-1 min-h-0 flex flex-col min-w-0 overflow-hidden transition-[margin] duration-200 ease-out ${isSidebarHovered ? 'md:ml-56' : 'md:ml-16'}`}
        >
          {/* Mobile Hamburger Menu */}
          <MobileMenu />
          <main className="flex-1 min-h-0 min-w-0 overflow-hidden relative" style={{ backgroundColor: '#ffffff' }}>
            {children}
          </main>
        </div>
        
      </div>
      {showOnboarding && mounted && createPortal(
        <OnboardingOverlay onComplete={() => { setShowOnboarding(false); router.push('/detailer-dashboard/followups'); }} />,
        document.body
      )}
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
