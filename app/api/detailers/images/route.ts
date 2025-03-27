import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '../../auth/[...nextauth]/route';
import { writeFile } from 'fs/promises';
import path from 'path';

async function saveLocalFile(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Create a unique filename
  const uniqueFilename = `${Date.now()}-${file.name}`;
  
  // Save to public/uploads directory
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  const filePath = path.join(uploadDir, uniqueFilename);
  
  await writeFile(filePath, buffer);
  
  // Return the public URL
  return `/uploads/${uniqueFilename}`;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const detailer = await prisma.detailer.findUnique({
      where: { email: session.user.email }
    });

    if (!detailer) {
      return NextResponse.json({ error: 'Detailer not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const files = formData.getAll('images');

    const uploadedImages = await Promise.all(
      files.map(async (file: any) => {
        // Save file locally and get URL
        const imageUrl = await saveLocalFile(file);
        
        // Save image record to database
        return prisma.image.create({
          data: {
            url: imageUrl,
            alt: file.name,
            detailerId: detailer.id,
            isFeatured: false
          }
        });
      })
    );

    return NextResponse.json(uploadedImages);
  } catch (error) {
    console.error('Image upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload images' },
      { status: 500 }
    );
  }
} 