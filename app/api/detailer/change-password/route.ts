import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { currentPassword, newPassword } = await request.json();
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
  // Find detailer by email
  const detailer = await prisma.detailer.findUnique({
    where: { email: session.user.email },
    select: { id: true, password: true }
  });
  if (!detailer || !detailer.password) {
    return NextResponse.json({ error: 'Detailer not found or password not set' }, { status: 404 });
  }
  // Check current password
  const isMatch = await bcrypt.compare(currentPassword, detailer.password);
  if (!isMatch) {
    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
  }
  // Hash new password
  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.detailer.update({
    where: { id: detailer.id },
    data: { password: hashed }
  });
  return NextResponse.json({ success: true });
} 