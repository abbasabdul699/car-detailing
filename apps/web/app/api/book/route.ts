import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@reeva/db'

const prisma = new PrismaClient()

export async function POST(req: NextRequest){
  const { slotId, contactId, businessId } = await req.json()
  const start = new Date()
  const job = await prisma.job.create({ 
    data: { 
      businessId, 
      contactId, 
      service:'fullDetail', 
      priceMin:150, 
      priceMax:170, 
      durationMin:120, 
      startTime: start 
    } 
  })
  return NextResponse.json({ 
    confirmation: `JOB-${job.id}`, 
    prepChecklist: ['Remove valuables','Have keys ready'] 
  })
}
