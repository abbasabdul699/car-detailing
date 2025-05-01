"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const isSearchPage = pathname === '/search-results';

  return (
    <nav className="bg-white/80 backdrop-blur-sm fixed w-full z-50">
      <div className="px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Left side with Logo */}
          <div className="flex items-center">
            <div className={isSearchPage ? "w-48" : ""}>
              <Link href="/" className="text-2xl font-bold text-[rgba(10,34,23,1)]">
                Reeva
              </Link>
            </div>

            {/* Search Bar - Only shown on search results page */}
            {isSearchPage && (
              <div className="flex-1 flex justify-center max-w-2xl mx-auto">
                <div className="w-full max-w-xl">
                  <div className="flex items-center bg-white rounded-full border shadow-sm">
                    <div className="pl-4">
                      <svg 
                        className="w-4 h-4 text-gray-400"
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" 
                        />
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" 
                        />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Search city, zip, or address"
                      className="w-full py-2 px-3 outline-none rounded-full text-gray-700 text-sm"
                    />
                    <button className="bg-[rgba(10,34,23,1)] text-white px-6 py-1.5 rounded-full hover:bg-[rgba(10,34,23,0.9)] transition-colors mr-1 text-sm">
                      Search
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right side with For Detailers button */}
          <div className="flex items-center">
            <button className="bg-[rgba(10,34,23,1)] text-white px-6 py-2 rounded-md hover:bg-[rgba(10,34,23,0.9)] transition-colors">
              For Detailers
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Button */}
      <div className="md:hidden flex items-center w-48 justify-end">
        <button 
          onClick={() => setIsOpen(!isOpen)} 
          className="text-gray-600 hover:text-[rgba(10,34,23,1)] transition-colors"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {isOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-white/80 backdrop-blur-sm">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link 
              href="#home" 
              className="block px-3 py-2 text-gray-600 hover:text-[rgba(10,34,23,1)] transition-colors"
            >
              Home
            </Link>
            <Link 
              href="#services" 
              className="block px-3 py-2 text-gray-600 hover:text-[rgba(10,34,23,1)] transition-colors"
            >
              Services
            </Link>
            <Link 
              href="#gallery" 
              className="block px-3 py-2 text-gray-600 hover:text-[rgba(10,34,23,1)] transition-colors"
            >
              Gallery
            </Link>
            <Link 
              href="#contact" 
              className="block px-3 py-2 text-gray-600 hover:text-[rgba(10,34,23,1)] transition-colors"
            >
              Contact
            </Link>
            <button className="w-full text-left bg-[rgba(10,34,23,1)] text-white px-3 py-2 rounded-md hover:bg-[rgba(10,34,23,0.9)] transition-colors">
              Book Now
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar; 