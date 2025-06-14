import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Middleware is disabled for all routes during development
export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/detailer-dashboard/:path*"],
}; 