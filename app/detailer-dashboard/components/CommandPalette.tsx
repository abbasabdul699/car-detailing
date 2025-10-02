"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Command } from 'cmdk';
import { useRouter } from 'next/navigation';
import {
  HomeIcon,
  UserIcon,
  CalendarDaysIcon,
  CalendarIcon,
  CubeIcon,
  PhotoIcon,
  StarIcon,
  DocumentTextIcon,
  CogIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  MoonIcon,
  SunIcon,
  PlusCircleIcon,
  ArrowUpTrayIcon,
  QuestionMarkCircleIcon,
  ChatBubbleLeftEllipsisIcon
} from "@heroicons/react/24/outline";

export function CommandPalette() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState("");
  const [focused, setFocused] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  const navigation = [
    { name: "Dashboard", href: "/detailer-dashboard", icon: HomeIcon },
    { name: "Messages", href: "/detailer-dashboard/messages", icon: ChatBubbleLeftRightIcon },
    { name: "Calendar", href: "/detailer-dashboard/calendar", icon: CalendarDaysIcon },
    { name: "Profile", href: "/detailer-dashboard/profile", icon: UserIcon },
    { name: "Services", href: "/detailer-dashboard/services", icon: CalendarIcon },
    { name: "Bundles", href: "/detailer-dashboard/bundles", icon: CubeIcon },
    { name: "Images", href: "/detailer-dashboard/images", icon: PhotoIcon },
    // { name: "Invoices", href: "/detailer-dashboard/invoices", icon: DocumentTextIcon },
    { name: "Settings", href: "/detailer-dashboard/settings", icon: CogIcon },
    { name: "Bookings", href: "/detailer-dashboard/bookings", icon: ChartBarIcon },
  ];

  const extraCommands = [
    {
      name: theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode",
      action: toggleTheme,
      icon: theme === "dark" ? SunIcon : MoonIcon,
    },
    {
      name: "Add New Bundle",
      action: () => router.push("/detailer-dashboard/bundles/new"),
      icon: PlusCircleIcon
    },
    {
      name: "Upload New Image",
      action: () => router.push("/detailer-dashboard/images/upload"),
      icon: ArrowUpTrayIcon
    },
    {
      name: "Go to Help",
      action: () => router.push("/help"),
      icon: QuestionMarkCircleIcon
    },
    {
      name: "Open Support Chat",
      action: () => alert("Opening support chat..."),
      icon: ChatBubbleLeftEllipsisIcon
    }
  ];

  const filteredNavigation = navigation.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredExtras = extraCommands.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (href: string) => {
    setSearch("");
    setFocused(false);
    router.push(href);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      if ((isMac && e.metaKey && e.key === 'k') || (!isMac && e.ctrlKey && e.key === 'k')) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="relative w-full">
      <Command className="w-full">
        <div className="relative">
          <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <Command.Input
            ref={inputRef}
            placeholder="Search or type command..."
            value={search}
            onValueChange={setSearch}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 100)}
            className="w-full pl-10 pr-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none"
          />
        </div>

        {(search || focused) && (
          <Command.List className="absolute z-20 mt-1 w-full rounded-md bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 max-h-60 overflow-auto">
            {filteredNavigation.length > 0 && (
              <Command.Group heading="Navigation">
                {filteredNavigation.map((item) => (
                  <Command.Item
                    key={item.href}
                    onSelect={() => handleSelect(item.href)}
                    className="flex items-center gap-2 px-4 py-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <item.icon className="h-4 w-4 text-gray-500 dark:text-gray-300" />
                    <span>{item.name}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
            {filteredExtras.length > 0 && (
              <Command.Group heading="Commands">
                {filteredExtras.map((item) => (
                  <Command.Item
                    key={item.name}
                    onSelect={item.action}
                    className="flex items-center gap-2 px-4 py-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <item.icon className="h-4 w-4 text-gray-500 dark:text-gray-300" />
                    <span>{item.name}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
            {filteredNavigation.length === 0 && filteredExtras.length === 0 && (
              <Command.Empty className="px-4 py-2 text-sm text-gray-500">No results found.</Command.Empty>
            )}
          </Command.List>
        )}
      </Command>
    </div>
  );
}
