import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest){
  const url = new URL(req.url)
  const from = new Date(url.searchParams.get('from')!)
  const slots = [0,2,4].map(i => ({ 
    id: `slot-${i}`, 
    start: new Date(from.getTime()+i*60*60*1000).toISOString(), 
    end: new Date(from.getTime()+(i+1)*60*60*1000).toISOString() 
  }))
  return NextResponse.json(slots)
}
