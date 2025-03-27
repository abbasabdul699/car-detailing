"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState<boolean>(false);
  const pathname = usePathname();

  const navItems = [
    { name: 'About Us', href: '/about-page' },
    { name: 'FAQ', href: '/faq' },
    { name: 'Help', href: '/help-page' }
  ];

  useEffect(() => {
    setIsScrolled(window.scrollY > 0);

    const handleScroll = (): void => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isActive = (path: string) => pathname === path;

  const handleForDetailersClick = (e: React.MouseEvent) => {
    const event = new CustomEvent('startTransition', {
      detail: {
        x: e.clientX,
        y: e.clientY
      }
    });
    window.dispatchEvent(event);
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
      isScrolled ? 'bg-[rgba(10,34,23,0.8)] backdrop-blur-sm shadow-sm' : 'bg-[#0A2217]'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left side - Logo and primary navigation */}
          <div className="flex items-center space-x-8">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link href="/" className="text-2xl font-bold text-white">
                Reeva
              </Link>
            </motion.div>

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
          </div>

          {/* Right side - CTA Buttons */}
          <div className="flex items-center space-x-4">
            <motion.div
              className="relative"
              whileHover={{ y: -2 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Link 
                href="/contact-us-page" 
                className="relative inline-block text-white text-sm group"
              >
                Get in Touch
                <motion.span
                  className="absolute -bottom-1 left-0 w-full h-[2px] bg-white"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: isActive('/contact-us-page') ? 1 : 0 }}
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
              <button 
                onClick={handleForDetailersClick}
                className="bg-white text-[#0A2217] px-4 py-2 rounded-full text-sm font-medium 
                         hover:bg-gray-100 transition-colors"
              >
                For Detailers
              </button>
            </motion.div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 