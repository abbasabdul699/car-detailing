import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export default withAuth(
  function middleware(req) {
    // Add custom middleware logic here if needed
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        // Customize authorization logic if needed
        return !!token
      },
    },
    pages: {
      signIn: '/auth/login',
    },
  }
)

export function middleware(request: NextRequest) {
  // Allow access to detailers API
  if (request.nextUrl.pathname.startsWith('/api/detailers')) {
    return NextResponse.next()
  }
  
  // Your other middleware logic here
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/api/detailers/:path*',
  ]
} 