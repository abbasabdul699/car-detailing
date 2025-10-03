import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 === TEST WEBHOOK START ===');
    
    const formData = await request.formData();
    const from = formData.get('From') as string;
    const body = formData.get('Body') as string;
    const to = formData.get('To') as string;

    console.log('📱 Test SMS:', { from, body, to });

    return new NextResponse('Test webhook working!', { status: 200 });
  } catch (error) {
    console.error('❌ Test webhook error:', error);
    return new NextResponse('Test webhook error', { status: 500 });
  }
}
