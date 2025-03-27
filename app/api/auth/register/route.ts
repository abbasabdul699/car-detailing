import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { hash } from 'bcrypt';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Hash the password before saving
    const hashedPassword = await hash(body.password, 10);

    // Create both User and Detailer records in a transaction
    const [user, detailer] = await prisma.$transaction([
      // Create User
      prisma.user.create({
        data: {
          email: body.email,
          password: hashedPassword,
          businessName: body.businessName,
          phoneNumber: body.phoneNumber || '',
          firstName: body.firstName || '',
          lastName: body.lastName || '',
          role: 'DETAILER',
          emailVerified: false
        }
      }),
      // Create Detailer
      prisma.detailer.create({
        data: {
          email: body.email,
          businessName: body.businessName || '',
          firstName: body.firstName || '',
          lastName: body.lastName || '',
          phone: body.phoneNumber || '',
          description: '',
          address: '',
          city: '',
          state: '',
          zipCode: '',
          password: hashedPassword
        }
      })
    ]);

    return NextResponse.json({ user, detailer });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Failed to register' },
      { status: 500 }
    );
  }
}

// Run this in a test route or Prisma Studio
const user = await prisma.detailer.findUnique({
  where: { email: 'asiabashir699@gmail.com' },
  select: { 
    email: true,
    password: true 
  }
});
console.log('User data:', {
  email: user?.email,
  hasPassword: !!user?.password,
  passwordLength: user?.password?.length
}); 