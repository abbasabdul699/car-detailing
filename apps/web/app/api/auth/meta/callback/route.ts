import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state') // businessId
    
    if (!code || !state) {
      return NextResponse.redirect('/admin/meta/error?error=missing_params')
    }

    console.log('🔄 Meta OAuth callback received for business:', state)

    // Exchange code for access token
    const tokenResponse = await fetch('https://graph.facebook.com/v18.0/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.META_APP_ID!,
        client_secret: process.env.META_APP_SECRET!,
        code,
        redirect_uri: `${process.env.APP_URL}/api/auth/meta/callback`
      })
    })

    const tokenData = await tokenResponse.json()
    
    if (!tokenData.access_token) {
      console.error('❌ Failed to get Meta access token:', tokenData)
      return NextResponse.redirect('/admin/meta/error?error=token_failed')
    }

    console.log('✅ Got Meta access token for business:', state)

    // Store the access token temporarily
    await prisma.business.update({
      where: { id: state },
      data: {
        metaAccessToken: tokenData.access_token,
        metaTokenExpiry: new Date(Date.now() + (tokenData.expires_in || 0) * 1000)
      }
    })

    // Redirect to business selection page
    return NextResponse.redirect(`/admin/meta/select-business?businessId=${state}`)
    
  } catch (error) {
    console.error('❌ Meta callback error:', error)
    return NextResponse.redirect('/admin/meta/error?error=callback_failed')
  }
}
