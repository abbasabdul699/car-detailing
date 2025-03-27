import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { writeFile } from 'fs/promises';
import path from 'path';
import { authOptions } from '../../../auth/[...nextauth]/route';

async function saveProfileImage(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const uniqueFilename = `profile-${Date.now()}-${file.name}`;
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'profiles');
  const filePath = path.join(uploadDir, uniqueFilename);
  
  await writeFile(filePath, buffer);
  return `/uploads/profiles/${uniqueFilename}`;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const imageUrl = await saveProfileImage(file);

    const updatedDetailer = await prisma.detailer.update({
      where: { email: session.user.email },
      data: { profileImage: imageUrl }
    });

    return NextResponse.json({ profileImage: imageUrl });
  } catch (error) {
    console.error('Profile image upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload profile image' },
      { status: 500 }
    );
  }
} 