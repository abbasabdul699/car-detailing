"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { MoonIcon, SunIcon, UserCircleIcon, Cog8ToothIcon, QuestionMarkCircleIcon, ArrowLeftStartOnRectangleIcon } from '@heroicons/react/24/outline';
import { CommandPalette } from "./CommandPalette";
import { useTheme } from "@/app/components/ThemeContext";
import NotificationBell from "./NotificationBell";

export default function DashboardNavbar({ onLogout }: { onLogout: () => void }) {
  const { data: session } = useSession();
  const { theme, toggleTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);


    return (
    <div className="sticky top-0 z-20 w-full h-16 border-b border-gray-200 bg-white flex items-center justify-between px-4 sm:px-6 lg:px-8">
      {/* Left: Searchbar with icon and shortcut */}
      <div className="flex items-center gap-2 w-full max-w-md relative">
        <span className="absolute left-3 text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </span>
        <CommandPalette />
        <kbd className="ml-2 rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">⌘ K</kbd>
      </div>

      {/* Right: Theme, Bell, Avatar */}
      <div className="flex items-center space-x-4">
        <button
          onClick={toggleTheme}
          type="button"
          className="rounded-full p-2 text-gray-400 hover:text-gray-600 focus:outline-none"
        >
          {theme === 'dark' ? (
            <SunIcon className="h-6 w-6" />
          ) : (
            <MoonIcon className="h-6 w-6" />
          )}
        </button>

        <NotificationBell detailerId={session?.user?.id || ''} />

        <div className="relative" ref={dropdownRef}>
          <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center space-x-2 focus:outline-none">
            <div className="h-8 w-8 rounded-full overflow-hidden flex-shrink-0">
              <img
                className="w-full h-full object-cover"
                src={session?.user?.image || '/images/default-avatar.png'}
                alt="User avatar"
              />
            </div>
            <span className="text-sm font-medium text-gray-700 hidden md:block">
              {session?.user?.businessName || session?.user?.name}
            </span>
            <svg className={`h-5 w-5 text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
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
                <Link href="/detailer-dashboard/profile" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                  <UserCircleIcon className="mr-3 h-5 w-5 text-gray-400" />
                  Edit profile
                </Link>
                <Link href="/detailer-dashboard/settings" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                  <Cog8ToothIcon className="mr-3 h-5 w-5 text-gray-400" />
                  Account settings
                </Link>
                <Link href="/help-page" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                  <QuestionMarkCircleIcon className="mr-3 h-5 w-5 text-gray-400" />
                  Support
                </Link>
                <button
                  onClick={onLogout}
                  className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <ArrowLeftStartOnRectangleIcon className="mr-3 h-5 w-5 text-gray-400" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    );
}