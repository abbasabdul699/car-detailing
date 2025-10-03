import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { deleteImageFromS3 } from '@/lib/s3-utils';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const detailer = await prisma.detailer.findUnique({
      where: {
        id
      },
      select: {
        id: true,
        businessName: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        description: true,
        latitude: true,
        longitude: true,
        priceRange: true,
        website: true,
        businessHours: true,
        imageUrl: true,
        verified: true,
        hidden: true,
        images: true,
        detailerImages: true,
        services: {
          include: {
            service: {
              select: {
                id: true,
                name: true,
                description: true,
                icon: true,
                category: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    icon: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!detailer) {
      return NextResponse.json(
        { error: 'Detailer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(detailer);
  } catch (error) {
    console.error('Error fetching detailer:', error);
    return NextResponse.json(
      { error: 'Failed to fetch detailer' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();
    // Only allow updatable scalar fields
    const allowedFields = [
      'businessName', 'email', 'phone', 'address', 'city', 'state', 'zipCode',
      'description', 'latitude', 'longitude', 'priceRange', 'website', 'businessHours', 'imageUrl', 'verified', 'hidden', 'googlePlaceId',
      'firstName', 'lastName', 'instagram', 'tiktok', 'facebook', 'password', 'twilioPhoneNumber', 'personalAssistantPhoneNumber', 'personalPhoneNumber', 'smsEnabled'
    ];
    const updateData: Record<string, any> = {};
    for (const key of allowedFields) {
      if (key in data) updateData[key] = data[key];
    }
    // Coerce latitude and longitude to numbers if present
    if (typeof updateData.latitude === 'string') {
      updateData.latitude = parseFloat(updateData.latitude);
    }
    if (typeof updateData.longitude === 'string') {
      updateData.longitude = parseFloat(updateData.longitude);
    }

    // --- NEW CODE: Update services ---
    if (Array.isArray(data.services)) {
      // 1. Remove all existing services for this detailer
      await prisma.detailerService.deleteMany({
        where: { detailerId: id }
      });

      // 2. Find all service records matching the provided names
      const serviceRecords = await prisma.service.findMany({
        where: { name: { in: data.services } }
      });

      // 3. Add new services
      await prisma.$transaction(
        serviceRecords.map(service =>
          prisma.detailerService.create({
            data: {
              detailerId: id,
              serviceId: service.id
            }
          })
        )
      );
    }
    // --- END NEW CODE ---

    // Handle password update if provided
    if (typeof data.password === 'string' && data.password.trim().length > 0) {
      updateData.password = await bcrypt.hash(data.password.trim(), 10);
    }

    const updatedDetailer = await prisma.detailer.update({
      where: { id },
      data: updateData,
    });
    return Response.json(updatedDetailer);
  } catch (error) {
    return Response.json(
      { error: 'Failed to update detailer' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const detailerId = params.id;

    // 1. Delete all images from S3 and DB
    const images = await prisma.image.findMany({ where: { detailerId } });
    for (const image of images) {
      if (image.url.includes('amazonaws.com/')) {
        const key = image.url.split('.amazonaws.com/')[1];
        if (key) {
          try {
            await deleteImageFromS3(key);
            console.log('Deleted from S3:', key);
          } catch (err) {
            console.error('Failed to delete image from S3:', key, err);
          }
        } else {
          console.warn('Could not extract S3 key from URL:', image.url);
        }
      } else {
        console.log('Skipping non-S3 image:', image.url);
      }
    }
    await prisma.image.deleteMany({ where: { detailerId } });

    // 2. Delete all detailerImages from S3 and DB (if you use a separate table)
    if (prisma.detailerImage) {
      const detailerImages = await prisma.detailerImage.findMany({ where: { detailerId } });
      for (const image of detailerImages) {
        if (image.url.includes('amazonaws.com/')) {
          const key = image.url.split('.amazonaws.com/')[1];
          if (key) {
            try {
              await deleteImageFromS3(key);
              console.log('Deleted from S3:', key);
            } catch (err) {
              console.error('Failed to delete detailerImage from S3:', key, err);
            }
          } else {
            console.warn('Could not extract S3 key from URL:', image.url);
          }
        } else {
          console.log('Skipping non-S3 detailerImage:', image.url);
        }
      }
      await prisma.detailerImage.deleteMany({ where: { detailerId } });
    }

    // 3. Delete all services selected by the detailer
    await prisma.detailerService.deleteMany({ where: { detailerId } });

    // 4. Delete the detailer record itself
    await prisma.detailer.delete({ where: { id: detailerId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting detailer:', error);
    return NextResponse.json({ error: 'Failed to delete detailer' }, { status: 500 });
  }
} 