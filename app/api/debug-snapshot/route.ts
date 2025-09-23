import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeToE164 } from '@/lib/phone';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const detailerId = searchParams.get('detailerId');
    const phone = searchParams.get('phone');
    
    if (!detailerId || !phone) {
      return NextResponse.json({ error: 'Missing detailerId or phone' }, { status: 400 });
    }
    
    const normalizedPhone = normalizeToE164(phone);
    
    const snapshot = await prisma.customerSnapshot.findUnique({
      where: { 
        detailerId_customerPhone: { 
          detailerId, 
          customerPhone: normalizedPhone 
        } 
      },
    });
    
    return NextResponse.json({ 
      phone: normalizedPhone,
      snapshot: snapshot,
      exists: !!snapshot
    });
  } catch (error) {
    console.error('Error checking snapshot:', error);
    return NextResponse.json({ error: 'Failed to check snapshot' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const detailerId = searchParams.get('detailerId');
    const phone = searchParams.get('phone');
    
    if (!detailerId || !phone) {
      return NextResponse.json({ error: 'Missing detailerId or phone' }, { status: 400 });
    }
    
    const normalizedPhone = normalizeToE164(phone);
    
    const deleted = await prisma.customerSnapshot.deleteMany({
      where: { 
        detailerId,
        customerPhone: normalizedPhone
      },
    });
    
    return NextResponse.json({ 
      deleted: deleted.count,
      message: `Deleted ${deleted.count} snapshots for ${normalizedPhone}`
    });
  } catch (error) {
    console.error('Error deleting snapshot:', error);
    return NextResponse.json({ error: 'Failed to delete snapshot' }, { status: 500 });
  }
}
