"use client";
import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
 
export default function ConditionalNavbar() {
  const pathname = usePathname();
  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/detailer-dashboard") ||
    pathname.startsWith("/detailer-login")
  ) return null;
  return <Navbar />;
} 