import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const businessId = searchParams.get('businessId')
  
  // Meta OAuth URL with required permissions
  const metaAuthUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth')
  metaAuthUrl.searchParams.set('client_id', process.env.META_APP_ID!)
  metaAuthUrl.searchParams.set('redirect_uri', `${process.env.APP_URL}/api/auth/meta/callback`)
  metaAuthUrl.searchParams.set('scope', [
    'pages_show_list',           // List their Facebook pages
    'pages_read_engagement',     // Read page data
    'ads_management',           // Access ad accounts
    'leads_retrieval',          // Get lead form data
    'business_management'       // Access business accounts
  ].join(','))
  metaAuthUrl.searchParams.set('state', businessId || '')
  
  return NextResponse.redirect(metaAuthUrl.toString())
}
