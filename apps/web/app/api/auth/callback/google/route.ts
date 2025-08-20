import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state') // This is your businessId

  console.log('🔍 OAuth Callback Debug:', { code: !!code, state })

  if (!code || !state) {
    console.error('❌ Missing code or state:', { code: !!code, state })
    return NextResponse.json({ error: 'Missing code or state' }, { status: 400 })
  }

  try {
    console.log('🔄 Exchanging code for tokens...')
    
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    )

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code)
    console.log('✅ Got tokens:', { 
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiry: tokens.expiry_date
    })
    
    // Get user info using the access token
    oauth2Client.setCredentials(tokens)
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
    const userInfo = await oauth2.userinfo.get()
    console.log('✅ Got user info:', userInfo.data.email)

    console.log('💾 Updating business record...')
    // Update business with Google Calendar info
    const updatedBusiness = await prisma.business.update({
      where: { id: state },
      data: {
        gcalAccount: userInfo.data.email,
        gcalAccessToken: tokens.access_token,
        gcalRefreshToken: tokens.refresh_token,
        gcalTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null
      }
    })
    console.log('✅ Business updated:', updatedBusiness.id)

    return NextResponse.redirect('http://localhost:3001/auth/success')
  } catch (error) {
    console.error('❌ OAuth callback error:', error)
    return NextResponse.redirect('http://localhost:3001/auth/error')
  }
}
