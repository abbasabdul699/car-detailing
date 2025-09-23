import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function buildVCF({ name, org, phone, email, url }: { name: string; org?: string; phone: string; email?: string; url?: string }) {
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${name}`,
    org ? `ORG:${org}` : '',
    `TEL;TYPE=CELL:${phone}`,
    email ? `EMAIL:${email}` : '',
    url ? `URL:${url}` : '',
    'END:VCARD',
  ].filter(Boolean)
  return lines.join('\r\n')
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const detailerId = searchParams.get('detailerId')
    if (!detailerId) return NextResponse.json({ error: 'Missing detailerId' }, { status: 400 })

    const detailer = await prisma.detailer.findUnique({ where: { id: detailerId } })
    if (!detailer) return NextResponse.json({ error: 'Detailer not found' }, { status: 404 })

    const vcf = buildVCF({
      name: detailer.businessName,
      org: detailer.businessName,
      phone: detailer.twilioPhoneNumber || detailer.phone,
      email: detailer.email || undefined,
      url: detailer.website || undefined,
    })

    return new NextResponse(vcf, {
      status: 200,
      headers: {
        'Content-Type': 'text/vcard; charset=utf-8',
        'Content-Disposition': `attachment; filename="${detailer.businessName.replace(/\s+/g, '_')}.vcf"`,
      },
    })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to generate vCard' }, { status: 500 })
  }
}


