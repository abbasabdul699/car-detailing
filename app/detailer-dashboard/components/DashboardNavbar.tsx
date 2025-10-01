"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { BellIcon, MoonIcon, SunIcon, UserCircleIcon, Cog8ToothIcon, QuestionMarkCircleIcon, ArrowLeftStartOnRectangleIcon } from '@heroicons/react/24/outline';
import { CommandPalette } from "./CommandPalette";
import { useTheme } from "@/app/components/ThemeContext";
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  message: string;
  createdAt: string;
  read: boolean;
  link?: string;
}

export default function DashboardNavbar({ onLogout }: { onLogout: () => void }) {
  const { data: session } = useSession();
  const { theme, toggleTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const unreadCount = notifications.filter(n => !n.read).length;
  
  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchNotifications();
    }
  }, [session]);

  const handleNotificationsToggle = async () => {
    setNotificationsOpen(!notificationsOpen);
    if (!notificationsOpen && unreadCount > 0) {
      // Mark unread notifications as read
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds: unreadIds }),
      });
      // Optimistically update the UI
      setNotifications(notifications.map(n => ({ ...n, read: true })));
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef, notificationsRef]);


    return (
    <div className="sticky top-0 z-20 w-full h-16 border-b border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700 flex items-center justify-between px-4 sm:px-6 lg:px-8">
      {/* Left: Searchbar with icon and shortcut */}
      <div className="flex items-center gap-2 w-full max-w-md relative">
        <span className="absolute left-3 text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </span>
        <CommandPalette />
        <kbd className="ml-2 rounded bg-gray-100 px-2 py-1 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300">⌘ K</kbd>
      </div>

      {/* Right: Theme, Bell, Avatar */}
      <div className="flex items-center space-x-4">
        <button
          onClick={toggleTheme}
          type="button"
          className="rounded-full p-2 text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-white focus:outline-none"
        >
          {theme === 'dark' ? (
            <SunIcon className="h-6 w-6" />
          ) : (
            <MoonIcon className="h-6 w-6" />
          )}
        </button>

        <div className="relative" ref={notificationsRef}>
          <button
            onClick={handleNotificationsToggle}
            type="button"
            className="rounded-full p-2 text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-white focus:outline-none relative"
          >
            <BellIcon className="h-6 w-6" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
              </span>
            )}
          </button>
          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 origin-top-right rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              <div className="py-1">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</p>
                  {loading && <p className="text-xs text-gray-500">Loading...</p>}
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map(notification => (
                      <Link key={notification.id} href={notification.link || '#'} className={`block px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700`}>
                        <p className={`font-medium ${!notification.read ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>{notification.message}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}</p>
                      </Link>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">No new notifications</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="relative" ref={dropdownRef}>
          <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center space-x-2 focus:outline-none">
            <div className="h-8 w-8 rounded-full overflow-hidden flex-shrink-0">
              <img
                className="w-full h-full object-cover"
                src={session?.user?.image || '/images/default-avatar.png'}
                alt="User avatar"
              />
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden md:block">
              {session?.user?.businessName || session?.user?.name}
            </span>
            <svg className={`h-5 w-5 text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
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
                <Link href="/detailer-dashboard/profile" className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                  <UserCircleIcon className="mr-3 h-5 w-5 text-gray-400" />
                  Edit profile
                </Link>
                <Link href="/detailer-dashboard/settings" className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                  <Cog8ToothIcon className="mr-3 h-5 w-5 text-gray-400" />
                  Account settings
                </Link>
                <Link href="/help-page" className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                  <QuestionMarkCircleIcon className="mr-3 h-5 w-5 text-gray-400" />
                  Support
                </Link>
                <button
                  onClick={onLogout}
                  className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
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