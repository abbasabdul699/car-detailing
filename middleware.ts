import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Middleware is disabled for all routes during development
export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export { default } from "next-auth/middleware"

export const config = { matcher: ["/admin/:path*", "/detailer-dashboard/:path*"] } 