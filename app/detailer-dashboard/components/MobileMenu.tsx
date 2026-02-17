"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { XMarkIcon, Bars3Icon, ArrowLeftStartOnRectangleIcon, Cog8ToothIcon } from "@heroicons/react/24/outline";
import { Home, Calendar as CalendarIcon, Inbox, Users, Target } from "lucide-react";

export default function MobileMenu() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchCurrentX = useRef(0);
  const isSwiping = useRef(false);
  const lastScrollY = useRef(0);

  const openMenu = () => {
    setIsAnimating(true);
    setSwipeOffset(0);
    requestAnimationFrame(() => {
      setIsMenuOpen(true);
    });
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
    setSwipeOffset(0);
    setTimeout(() => {
      setIsAnimating(false);
    }, 300);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
        setSwipeOffset(0);
        setTimeout(() => setIsAnimating(false), 300);
      }
    };

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  // Swipe-to-close touch handlers
  useEffect(() => {
    const menuEl = menuRef.current;
    if (!menuEl || !isMenuOpen) return;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
      touchCurrentX.current = e.touches[0].clientX;
      isSwiping.current = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isSwiping.current) return;
      touchCurrentX.current = e.touches[0].clientX;
      const diff = touchStartX.current - touchCurrentX.current;
      if (diff > 0) {
        setSwipeOffset(Math.min(diff, 320));
      }
    };

    const handleTouchEnd = () => {
      if (!isSwiping.current) return;
      isSwiping.current = false;
      const diff = touchStartX.current - touchCurrentX.current;
      if (diff > 80) {
        closeMenu();
      } else {
        setSwipeOffset(0);
      }
    };

    menuEl.addEventListener("touchstart", handleTouchStart, { passive: true });
    menuEl.addEventListener("touchmove", handleTouchMove, { passive: true });
    menuEl.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      menuEl.removeEventListener("touchstart", handleTouchStart);
      menuEl.removeEventListener("touchmove", handleTouchMove);
      menuEl.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isMenuOpen]);

  // Track scroll position
  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      if (!target || target === document as any) return;
      const scrollY = target.scrollTop ?? 0;
      setIsScrolled(scrollY > 10);
    };

    document.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    return () => document.removeEventListener('scroll', handleScroll, { capture: true });
  }, []);

  // Menu items matching Figma design
  // Top items: Calendar, Customers, Messages - 20px font, white
  // Bottom items: Profile, Settings - 16px font, gray (#ababab)
  const topNavigationItems = [
    { name: "Home", href: "/detailer-dashboard", icon: Home, exact: true },
    { name: "Calendar", href: "/detailer-dashboard/calendar", icon: CalendarIcon },
    { name: "Conversation", href: "/detailer-dashboard/messages", icon: Inbox },
    { name: "Customer", href: "/detailer-dashboard/customers", icon: Users },
  ];

  const bottomNavigationItems = [
    { name: "Profile", href: "/detailer-dashboard/profile", icon: null },
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
        onClick={() => isMenuOpen ? closeMenu() : openMenu()}
        className="md:hidden fixed top-4 left-4 z-[10000] w-8 h-8 flex items-center justify-center rounded-lg transition action-panel-hide event-modal-hide customer-profile-hide messages-chat-hide"
        aria-label="Menu"
      >
        <Bars3Icon className="w-6 h-6 text-gray-700" />
      </button>

      {/* Hamburger Menu - Mobile Only */}
      {isAnimating && (
        <>
          <div
            className={`md:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-[10001] transition-opacity duration-300 ${
              isMenuOpen ? 'opacity-100' : 'opacity-0'
            }`}
            onClick={closeMenu}
          />
          <div
            ref={menuRef}
            className="md:hidden fixed top-0 left-0 h-full w-80 bg-black shadow-xl z-[10002] ease-out"
            style={{
              transform: isMenuOpen
                ? `translateX(${-swipeOffset}px)`
                : 'translateX(-100%)',
              transition: swipeOffset > 0 ? 'none' : 'transform 300ms ease-out',
            }}
          >
            <div className="flex flex-col h-full">
              {/* Header - Close Button & Logo */}
              <div className="px-6 pt-6 pb-4 flex items-center justify-between">
                <button
                  onClick={closeMenu}
                  className="w-8 h-8 flex items-center justify-center rounded-lg"
                  aria-label="Close menu"
                >
                  <XMarkIcon className="w-6 h-6 text-white" />
                </button>
                <Image
                  src="/REEVA LOGO.png"
                  alt="Reeva logo"
                  width={48}
                  height={48}
                  className="rounded-full"
                />
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
                          onClick={closeMenu}
                          className={`flex items-center gap-3 transition ${
                            isActive
                              ? ""
                              : "text-white hover:opacity-80"
                          }`}
                        >
                          <Icon className="w-6 h-6 flex-shrink-0" strokeWidth={1.75} style={{ color: isActive ? '#ababab' : 'white' }} />
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
                      const isProfile = item.name === "Profile";
                      const isResources = item.name === "Resources";
                      const profileImage = session?.user?.image;
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={closeMenu}
                          className={`flex items-center gap-3 transition ${
                            isActive
                              ? "opacity-100"
                              : "hover:opacity-80"
                          }`}
                        >
                          {isProfile && profileImage ? (
                            <img
                              src={profileImage}
                              alt="Profile"
                              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                            />
                          ) : isResources && (item as any).image ? (
                            <Image
                              src={(item as any).image}
                              alt="Resources"
                              width={24}
                              height={24}
                              className="w-6 h-6 flex-shrink-0 invert opacity-60"
                            />
                          ) : Icon ? (
                            <Icon 
                              className="w-6 h-6 flex-shrink-0" 
                              style={{ color: isActive ? 'white' : '#ababab' }}
                            />
                          ) : (
                            <div className="w-6 h-6 flex-shrink-0" />
                          )}
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
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 transition hover:opacity-80"
                    >
                      <ArrowLeftStartOnRectangleIcon 
                        className="w-6 h-6 flex-shrink-0" 
                        style={{ color: '#ababab' }}
                      />
                      <span 
                        className="font-normal"
                        style={{
                          fontFamily: "'Helvetica Neue', sans-serif",
                          fontSize: '16px',
                          lineHeight: 'normal',
                          color: '#ababab'
                        }}
                      >
                        Sign Out
                      </span>
                    </button>
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
