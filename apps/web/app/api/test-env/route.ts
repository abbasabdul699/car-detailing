import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    hasClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    hasRedirectUri: !!process.env.GOOGLE_REDIRECT_URI,
    clientId: process.env.GOOGLE_CLIENT_ID?.substring(0, 20) + '...',
    redirectUri: process.env.GOOGLE_REDIRECT_URI
  })
}
