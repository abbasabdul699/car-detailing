import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Middleware is disabled for all routes during development
export function middleware(request: NextRequest) {
  if (process.env.NODE_ENV !== "production") {
    const rawCookie = request.headers.get("cookie") || "";
    console.log("[middleware][detailer-dashboard]", {
      path: request.nextUrl.pathname,
      hasDefaultSessionCookie: rawCookie.includes("next-auth.session-token"),
      hasDetailerSessionCookie: rawCookie.includes("next-auth.detailer.session-token"),
    });
  }
  return NextResponse.next();
}

export { default } from "next-auth/middleware"

export const config = { matcher: ["/admin/:path*", "/detailer-dashboard/:path*"] } 
