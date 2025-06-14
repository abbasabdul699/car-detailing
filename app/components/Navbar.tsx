"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useLoadScript } from '@react-google-maps/api';

const GOOGLE_MAPS_LIBRARIES = ['places'];

const Navbar = () => {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const router = useRouter();
  const inputRefDesktop = useRef<HTMLInputElement>(null);
  const inputRefMobile = useRef<HTMLInputElement>(null);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const navItems = [
    { name: 'About Us', href: '/about-page' },
    { name: 'FAQ', href: '/faq' },
    { name: 'Help', href: '/help-page' }
  ];

  const isActive = (path: string) => pathname === path;

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isLoaded || !window.google) return;

    const options = {
      componentRestrictions: { country: "us" },
      fields: ["address_components", "geometry", "formatted_address"],
      strictBounds: false,
    };

    // Attach autocomplete to the visible input
    const ref = pathname === '/' ? null : (window.innerWidth < 768 ? inputRefMobile.current : inputRefDesktop.current);
    if (!ref) return;

    const autocomplete = new window.google.maps.places.Autocomplete(ref, options);

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (!place.geometry?.location) return;
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      const formattedAddress = place.formatted_address;
      window.location.href = `/search-results?location=${encodeURIComponent(formattedAddress || '')}&lat=${lat}&lng=${lng}`;
    });

    return () => {
      window.google.maps.event.clearInstanceListeners(autocomplete);
    };
  }, [isLoaded, pathname]);

  const handleForDetailersClick = (e: React.MouseEvent) => {
    const event = new CustomEvent('startTransition', {
      detail: {
        x: e.clientX,
        y: e.clientY
      }
    });
    window.dispatchEvent(event);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      router.push(`/search-results?location=${encodeURIComponent(search)}`);
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-[#0A2217]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left side - Logo and primary navigation */}
          <div className="flex items-center space-x-8 flex-1">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link href="/" className="text-2xl font-bold text-white">
                Reeva
              </Link>
            </motion.div>

            {/* Desktop nav */}
            <div className="hidden md:flex space-x-8">
              {navItems.map((item) => (
                <motion.div
                  key={item.name}
                  className="relative"
                  whileHover={{ y: -2 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Link 
                    href={item.href}
                    className="relative inline-block text-white text-sm group"
                  >
                    {item.name}
                    <motion.span
                      className="absolute -bottom-1 left-0 w-full h-[2px] bg-white"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: isActive(item.href) ? 1 : 0 }}
                      whileHover={{ scaleX: 1 }}
                      transition={{ duration: 0.2 }}
                    />
                  </Link>
                </motion.div>
              ))}
            </div>

            {/* Search Bar (Desktop) */}
            {pathname !== '/' && (
            <form
              onSubmit={e => e.preventDefault()}
              className="flex-grow max-w-md flex items-center bg-white rounded-full shadow px-4 py-2 mx-8"
              style={{ minWidth: 260 }}
            >
              <input
                  ref={inputRefDesktop}
                type="text"
                className="flex-1 bg-transparent outline-none text-gray-800 placeholder-gray-400"
                placeholder={isLoaded ? "Where to?" : "Loading..."}
                disabled={!isLoaded}
              />
              <button
                type="submit"
                className="ml-2 bg-[#16a34a] hover:bg-[#15803d] text-white rounded-full p-2 transition"
                aria-label="Search"
              >
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </button>
            </form>
            )}
          </div>

          {/* Desktop CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <motion.div
              className="relative"
              whileHover={{ y: -2 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Link 
                href="/get-in-touch" 
                className="relative inline-block text-white text-sm group"
              >
                Get in Touch
                <motion.span
                  className="absolute -bottom-1 left-0 w-full h-[2px] bg-white"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: isActive('/get-in-touch') ? 1 : 0 }}
                  whileHover={{ scaleX: 1 }}
                  transition={{ duration: 0.2 }}
                  style={{ originX: 0 }}
                />
              </Link>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <Link 
                href="/for-detailers"
                className="relative inline-flex items-center justify-center px-6 py-2 overflow-hidden text-white font-medium transition-all duration-300 ease-in-out rounded-full group hover:scale-[1.02] bg-gradient-to-r from-[#0A2217] via-[#22c55e] to-[#4ade80] hover:from-[#4ade80] hover:via-[#22c55e] hover:to-[#0A2217] shadow-md"
              >
                <span className="relative">For Detailers</span>
              </Link>
            </motion.div>
          </div>

          {/* Hamburger menu button - mobile only */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileOpen((open) => !open)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              className="text-white focus:outline-none"
            >
              {mobileOpen ? (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu overlay with animation */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="md:hidden fixed inset-0 z-50 bg-[#0A2217] flex flex-col"
          >
            {/* Top bar: Logo and close button */}
            <div className="flex items-center justify-between px-6 pt-6 pb-2">
              <Link href="/" className="text-2xl font-bold text-white" onClick={() => setMobileOpen(false)}>
                Reeva
              </Link>
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="text-white focus:outline-none"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Mobile Search Bar */}
            {pathname !== '/' && (
              <form
                onSubmit={e => e.preventDefault()}
                className="w-full flex items-center bg-white rounded-full shadow px-4 py-2 mb-4 mx-auto max-w-xs"
                style={{ minWidth: 200 }}
              >
                <input
                  ref={inputRefMobile}
                  type="text"
                  className="flex-1 bg-transparent outline-none text-gray-800 placeholder-gray-400"
                  placeholder={isLoaded ? "Where to?" : "Loading..."}
                  disabled={!isLoaded}
                />
                <button
                  type="submit"
                  className="ml-2 bg-[#16a34a] hover:bg-[#15803d] text-white rounded-full p-2 transition"
                  aria-label="Search"
                >
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </button>
              </form>
            )}
            {/* Menu items vertically centered */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ delay: 0.1 }}
              className="flex-1 flex flex-col justify-center items-start px-8 space-y-8"
            >
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-white text-3xl font-extrabold tracking-tight hover:text-[#22c55e] transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              <Link
                href="/get-in-touch"
                className="text-white text-3xl font-extrabold tracking-tight hover:text-[#22c55e] transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                Get in Touch
              </Link>
              <Link
                href="/for-detailers"
                className="inline-flex items-center justify-center px-6 py-3 mt-4 text-white text-2xl font-bold rounded-full bg-gradient-to-r from-[#0A2217] via-[#22c55e] to-[#4ade80] hover:from-[#4ade80] hover:via-[#22c55e] hover:to-[#0A2217] shadow-md transition-all"
                onClick={() => setMobileOpen(false)}
              >
                For Detailers
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar; 