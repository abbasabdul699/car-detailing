"use client";

import { useState, useEffect } from 'react';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollPosition(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <nav className={`sticky top-0 bg-[rgba(10,34,23,1)] shadow-lg w-full z-50 transition-transform duration-300`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="text-2xl font-bold text-white">
              Renu
            </div>
          </div>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#services" className="text-gray-300 hover:text-white transition-colors">Services</a>
            <a href="#aboutus" className="text-gray-300 hover:text-white transition-colors">About Us</a>
            <a href="#faq" className="text-gray-300 hover:text-white transition-colors">FAQ</a>
            <a href="#contact" className="text-gray-300 hover:text-white transition-colors">Contact</a>
            <button className="bg-white text-[rgba(10,34,23,1)] px-4 py-2 rounded-md hover:bg-gray-100 transition-colors">
            For Detailers
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button 
              onClick={() => setIsOpen(!isOpen)} 
              className="text-gray-300 hover:text-white transition-colors"
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
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-[rgba(10,34,23,1)]">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <a href="#services" className="block px-3 py-2 text-gray-300 hover:text-white transition-colors">Services</a>
            <a href="#aboutus" className="block px-3 py-2 text-gray-300 hover:text-white transition-colors">About Us</a>
            <a href="#faq" className="block px-3 py-2 text-gray-300 hover:text-white transition-colors">FAQ</a>
            <a href="#contact" className="block px-3 py-2 text-gray-300 hover:text-white transition-colors">Contact</a>
            <button className="w-full text-left bg-white text-[rgba(10,34,23,1)] px-3 py-2 rounded-md hover:bg-gray-100 transition-colors">
              For Detailers
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar; 