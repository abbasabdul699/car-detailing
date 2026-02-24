"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChatBubbleLeftRightIcon,
  CalendarDaysIcon,
  UserIcon,
  PlusIcon,
  ClipboardDocumentListIcon,
  PhotoIcon,
  CubeIcon,
  UserGroupIcon,
  CreditCardIcon,
  HomeIcon,
  BookOpenIcon,
} from "@heroicons/react/24/outline";
import {
  ChatBubbleLeftRightIcon as ChatBubbleLeftRightIconSolid,
  CalendarDaysIcon as CalendarDaysIconSolid,
  UserIcon as UserIconSolid,
  HomeIcon as HomeIconSolid,
  BookOpenIcon as BookOpenIconSolid,
} from "@heroicons/react/24/solid";
import { useState, useMemo } from "react";

type NavItem = {
  name: string;
  href: string;
  icon: (props: React.ComponentProps<"svg">) => JSX.Element;
  iconSolid: (props: React.ComponentProps<"svg">) => JSX.Element;
};

const items: NavItem[] = [
  {
    name: "Home",
    href: "/detailer-dashboard",
    icon: HomeIcon,
    iconSolid: HomeIconSolid
  },
  { 
    name: "Resources", 
    href: "/detailer-dashboard/resources", 
    icon: BookOpenIcon,
    iconSolid: BookOpenIconSolid
  },
  { 
    name: "Messages", 
    href: "/detailer-dashboard/messages", 
    icon: ChatBubbleLeftRightIcon,
    iconSolid: ChatBubbleLeftRightIconSolid
  },
  { 
    name: "Calendar", 
    href: "/detailer-dashboard/calendar", 
    icon: CalendarDaysIcon,
    iconSolid: CalendarDaysIconSolid
  },
  { 
    name: "Profile", 
    href: "/detailer-dashboard/profile", 
    icon: UserIcon,
    iconSolid: UserIconSolid
  },
];

export default function MobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);

  const actions = useMemo(() => {
    return [
      { label: "Customers", onClick: () => router.push("/detailer-dashboard/customers"), icon: UserGroupIcon },
      { label: "Services", onClick: () => router.push("/detailer-dashboard/services"), icon: CubeIcon },
      { label: "Manage Images", onClick: () => router.push("/detailer-dashboard/images?upload=1"), icon: PhotoIcon },
      { label: "Subscription", onClick: () => router.push("/detailer-dashboard/subscription"), icon: CreditCardIcon },
    ];
  }, [router]);

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Mobile navigation"
    >
      {/* Action Sheet Backdrop */}
      {sheetOpen && (
        <button
          aria-label="Close action sheet"
          onClick={() => setSheetOpen(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        />
      )}

      {/* Action Sheet */}
      {sheetOpen && (
        <div className="fixed bottom-16 left-0 right-0 z-[60] px-3">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
            {actions.map((a, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setSheetOpen(false);
                  a.onClick();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-800 active:bg-gray-100"
              >
                {a.icon && <a.icon className="h-5 w-5 text-gray-500" />}
                <span>{a.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tabs with center FAB */}
      <div className="relative h-16">
        <div className="grid grid-cols-5 h-full">
          {/* Left two tabs */}
          {items.slice(0, 2).map((item) => {
            const active = pathname === item.href;
            const IconComponent = active ? item.iconSolid : item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center justify-center py-2 transition-all duration-200 ${
                  active ? "text-gray-900" : "text-gray-500"
                }`}
              >
                <IconComponent className={`h-6 w-6 ${active ? "scale-110" : "scale-100"}`} />
                <span className="text-xs mt-1 font-medium">{item.name}</span>
              </Link>
            );
          })}

          {/* Center FAB slot */}
          <div className="flex items-center justify-center">
            <button
              aria-label="Create"
              onClick={() => setSheetOpen((o) => !o)}
              className="relative -mt-6 h-12 w-12 rounded-full bg-black text-white shadow-xl active:scale-95 transition transform"
            >
              <PlusIcon className="h-7 w-7 mx-auto" />
            </button>
          </div>

          {/* Right two tabs */}
          {items.slice(2).map((item) => {
            const active = pathname === item.href;
            const IconComponent = active ? item.iconSolid : item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center justify-center py-2 transition-all duration-200 ${
                  active ? "text-gray-900" : "text-gray-500"
                }`}
              >
                <IconComponent className={`h-6 w-6 ${active ? "scale-110" : "scale-100"}`} />
                <span className="text-xs mt-1 font-medium">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}



