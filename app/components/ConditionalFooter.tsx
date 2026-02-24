"use client";
import { usePathname } from "next/navigation";
import Footer from "./Footer";
 
export default function ConditionalFooter() {
  const pathname = usePathname();
  
  // Don't show footer on dashboard and detailer auth pages
  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/detailer-dashboard") ||
    pathname.startsWith("/detailer-login")
  ) {
    return null;
  }
  
  return <Footer />;
}
