import { prisma } from '@/lib/prisma';
import { hash } from 'bcrypt';

export async function POST(req: Request) {
  try {
    const { email, newPassword } = await req.json();
    
    // Hash the new password
    const hashedPassword = await hash(newPassword, 10);
    
    // Update the user's password
    const updatedUser = await prisma.detailer.update({
      where: { email },
      data: { 
        password: hashedPassword
      }
    });

    return new Response(JSON.stringify({ success: true }));
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
} 


