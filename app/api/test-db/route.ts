import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const user = await prisma.detailer.findFirst();
    return new Response(JSON.stringify({ 
      success: true, 
      hasUser: !!user 
    }));
  } catch (error) {
    console.error('Database test error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), { status: 500 });
  }
} 