import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    
    if (!businessId) {
      return NextResponse.json({ error: 'Business ID required' }, { status: 400 })
    }

    // Get the business and its Meta access token
    const business = await prisma.business.findUnique({
      where: { id: businessId }
    })

    if (!business?.metaAccessToken) {
      return NextResponse.json({ error: 'No Meta access token found' }, { status: 400 })
    }

    // Fetch user's business accounts from Meta
    const businessResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/businesses?access_token=${business.metaAccessToken}`
    )
    
    if (!businessResponse.ok) {
      console.error('Failed to fetch Meta businesses:', await businessResponse.text())
      return NextResponse.json({ error: 'Failed to fetch Meta businesses' }, { status: 500 })
    }

    const businessData = await businessResponse.json()
    
    // For each business, fetch its pages and ad accounts
    const businessesWithDetails = await Promise.all(
      businessData.data.map(async (metaBusiness: any) => {
        // Fetch pages
        const pagesResponse = await fetch(
          `https://graph.facebook.com/v18.0/${metaBusiness.id}/pages?access_token=${business.metaAccessToken}`
        )
        const pagesData = pagesResponse.ok ? await pagesResponse.json() : { data: [] }

        // Fetch ad accounts
        const adAccountsResponse = await fetch(
          `https://graph.facebook.com/v18.0/${metaBusiness.id}/adaccounts?access_token=${business.metaAccessToken}`
        )
        const adAccountsData = adAccountsResponse.ok ? await adAccountsResponse.json() : { data: [] }

        return {
          id: metaBusiness.id,
          name: metaBusiness.name,
          pages: pagesData.data || [],
          adAccounts: adAccountsData.data || []
        }
      })
    )

    return NextResponse.json({ 
      success: true, 
      businesses: businessesWithDetails 
    })
    
  } catch (error) {
    console.error('Error fetching Meta businesses:', error)
    return NextResponse.json({ error: 'Failed to fetch Meta businesses' }, { status: 500 })
  }
}
