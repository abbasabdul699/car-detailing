"use client";
import { SessionProvider } from "next-auth/react";

export default function DetailerSessionProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider basePath="/api/auth-detailer">{children}</SessionProvider>;
}
