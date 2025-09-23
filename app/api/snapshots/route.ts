import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { normalizeToE164 } from '@/lib/phone'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const detailerId = searchParams.get('detailerId') || undefined
    const phoneRaw = searchParams.get('phone') || undefined
    const phone = (normalizeToE164(phoneRaw || null) || phoneRaw || '').trim()

    if (!detailerId || !phone) {
      return NextResponse.json({ error: 'Missing detailerId or phone' }, { status: 400 })
    }

    const snapshot = await prisma.customerSnapshot.findUnique({
      where: { detailerId_customerPhone: { detailerId, customerPhone: phone } },
    })

    return NextResponse.json({ snapshot })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch snapshot' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { detailerId, phone: phoneRaw, customerName, address, vehicle, vehicleYear, vehicleMake, vehicleModel, data } = body || {}
    const phone = normalizeToE164(phoneRaw) || phoneRaw
    if (!detailerId || !phone) {
      return NextResponse.json({ error: 'Missing detailerId or phone' }, { status: 400 })
    }

    const snapshot = await prisma.customerSnapshot.upsert({
      where: { detailerId_customerPhone: { detailerId, customerPhone: phone } },
      update: { customerName, address, vehicle, vehicleYear, vehicleMake, vehicleModel, data },
      create: { detailerId, customerPhone: phone, customerName, address, vehicle, vehicleYear, vehicleMake, vehicleModel, data },
    })

    return NextResponse.json({ snapshot })
  } catch (e) {
    return NextResponse.json({ error: 'Failed to upsert snapshot' }, { status: 500 })
  }
}


