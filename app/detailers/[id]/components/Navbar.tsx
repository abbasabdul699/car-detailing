"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState<boolean>(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsScrolled(window.scrollY > 0);

    const handleScroll = (): void => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isScrolled ? 'bg-[rgba(10,34,23,0.8)] backdrop-blur-sm shadow-sm' : 'bg-[#0A2217]'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left side - Logo and primary navigation */}
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-2xl font-bold text-white">
              Reeva
            </Link>
            <div className="hidden md:flex space-x-8">
              <Link 
                href="/about-us"
                className="text-white hover:text-gray-200 transition-colors text-sm"
              >
                About us
              </Link>
              <Link 
                href="/blog"
                className="text-white hover:text-gray-200 transition-colors text-sm"
              >
                Blog
              </Link>
              <Link 
                href="/faq"
                className="text-white hover:text-gray-200 transition-colors text-sm"
              >
                FAQ
              </Link>
            </div>
          </div>

          {/* Right side - Language, Help, Login, and CTA */}
          <div className="flex items-center space-x-4">
            <button className="text-white hover:text-gray-200 px-4 py-2 text-sm">
              EN
            </button>
            <button className="text-white hover:text-gray-200 px-4 py-2 text-sm">
              Help
            </button>

            <Link 
              href="/for-Detailers"
              className="bg-white text-[#0A2217] px-4 py-2 rounded-full text-sm font-medium hover:bg-gray-100 transition-colors"
            >
              For Detailers
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
} 