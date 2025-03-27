import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const user = await prisma.detailer.findUnique({
      where: { 
        email: 'asiabashir699@gmail.com'
      },
      select: {
        id: true,
        email: true,
        password: true,
        businessName: true
      }
    });

    return new Response(JSON.stringify({
      exists: !!user,
      hasPassword: !!user?.password,
      passwordLength: user?.password?.length || 0
    }, null, 2));
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
} 