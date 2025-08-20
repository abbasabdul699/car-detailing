import { NextRequest, NextResponse } from 'next/server'

const base = { S:100, M:140, L:180, XL:220 }
const addOns: Record<string, number> = { petHair:40, heavySoil:50, engineBay:30 }
const packages: Record<string, number> = { exteriorOnly:-30, fullDetail:0, ceramicLite:120 }

export async function POST(req: NextRequest){
  const { vehicleSize, addOns: adds = [], condition = '', package: pkg = 'fullDetail' } = await req.json()
  const subtotal = base[vehicleSize] + (adds.reduce((s:string[],k)=>s,[]),0)
  const addTotal = (adds as string[]).reduce((sum, k) => sum + (addOns[k] || 0), 0)
  const pkgAdj = packages[pkg] || 0
  const price = base[vehicleSize] + addTotal + pkgAdj
  const duration = 90 + (adds.includes('heavySoil') ? 30 : 0)
  return NextResponse.json({ 
    priceMin: price, 
    priceMax: price + 20, 
    durationMin: duration, 
    lineItems: [] 
  })
}
