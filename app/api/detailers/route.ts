import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const detailerSchema = z.object({
  businessName: z.string().min(2),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().min(7),
  address: z.string(),
  city: z.string(),
  state: z.string(),
  zipCode: z.string(),
  description: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  priceRange: z.string(),
  website: z.string().optional(),
  imageUrl: z.string().optional(),
  businessHours: z.any(),
  services: z.array(z.string().min(1)), // service names
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');

    const detailers = await prisma.detailer.findMany({
      where: {
        verified: true,
        hidden: false,
      },
      select: {
        id: true,
        businessName: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        description: true,
        latitude: true,
        longitude: true,
        priceRange: true,
        services: { include: { service: true } },
        images: {
          select: {
            url: true,
            alt: true
          }
        }
      }
    });

    let sortedDetailers = detailers;

    if (lat && lng) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);
      sortedDetailers = detailers
        .map(d => {
          // Ensure lat/lng are valid numbers before calculating distance
          if (typeof d.latitude !== 'number' || typeof d.longitude !== 'number' || isNaN(d.latitude) || isNaN(d.longitude)) {
            return { ...d, distance: Infinity }; // Assign a high distance if location is invalid
          }
          return {
          ...d,
          distance: haversineDistance(userLat, userLng, d.latitude, d.longitude)
          };
        })
        .filter(d => d.distance !== Infinity) // Filter out detailers with invalid location
        .sort((a, b) => a.distance - b.distance);
    }
    
    return NextResponse.json(sortedDetailers, {
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error fetching detailers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch detailers' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = detailerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 });
    }
    const data = parsed.data;

    // Check if email already exists, if provided
    if (data.email) {
      const existingDetailer = await prisma.detailer.findUnique({
        where: { email: data.email }
      });
      if (existingDetailer) {
        return Response.json({ error: 'Email already exists' }, { status: 400 });
      }
    }

    // Upsert services and collect their IDs
    const serviceIds: string[] = [];
    for (const name of data.services) {
      let service = await prisma.service.findUnique({ where: { name } });
      if (!service) {
        let categoryName = "Additional";
        if (name.toLowerCase().includes("interior") || 
            name.toLowerCase().includes("vacuum") || 
            name.toLowerCase().includes("steam") ||
            name.toLowerCase().includes("leather") ||
            name.toLowerCase().includes("fabric") ||
            name.toLowerCase().includes("carpet") ||
            name.toLowerCase().includes("dashboard") ||
            name.toLowerCase().includes("console") ||
            name.toLowerCase().includes("door") ||
            name.toLowerCase().includes("seat")) {
          categoryName = "Interior";
        } else if (name.toLowerCase().includes("exterior") || 
                   name.toLowerCase().includes("wash") || 
                   name.toLowerCase().includes("wax") ||
                   name.toLowerCase().includes("polish") ||
                   name.toLowerCase().includes("buff") ||
                   name.toLowerCase().includes("tire") ||
                   name.toLowerCase().includes("wheel") ||
                   name.toLowerCase().includes("rim") ||
                   name.toLowerCase().includes("paint") ||
                   name.toLowerCase().includes("ceramic") ||
                   name.toLowerCase().includes("coating")) {
          categoryName = "Exterior";
        }
        
        let category = await prisma.category.findUnique({ where: { name: categoryName } });
        if (!category) {
          category = await prisma.category.create({ data: { name: categoryName } });
        }

        console.log('Creating service:', name, 'with category:', categoryName);
        service = await prisma.service.create({ 
          data: { 
            name,
            category: {
              connect: { id: category.id }
            }
          }
        });
      }
      serviceIds.push(service.id);
    }

    // 1. Create the detailer (without services)
    const detailerData: any = {
      businessName: data.businessName,
      phone: data.phone,
      address: data.address,
      city: data.city,
      state: data.state,
      zipCode: data.zipCode,
      description: data.description,
      latitude: data.latitude,
      longitude: data.longitude,
      priceRange: data.priceRange,
      website: data.website,
      imageUrl: data.imageUrl,
      businessHours: data.businessHours,
    };
    if (data.email && data.email.trim() !== '') {
      detailerData.email = data.email;
    }
    const detailer = await prisma.detailer.create({
      data: detailerData,
    });

    // 2. Create DetailerService records for each service
    await Promise.all(
      serviceIds.map(serviceId =>
        prisma.detailerService.create({
          data: {
            detailerId: detailer.id,
            serviceId,
          },
        })
      )
    );

    // 3. Return the created detailer with its services
    const detailerWithServices = await prisma.detailer.findUnique({
      where: { id: detailer.id },
      include: {
        services: {
          include: { service: true },
        },
      },
    });

    return NextResponse.json({ detailer: detailerWithServices });
  } catch (error) {
    console.error('Error creating detailer:', error);
    if (error instanceof Error) {
      console.error(error.stack);
    }
    return NextResponse.json({ error: 'Failed to create detailer', details: error instanceof Error ? error.message : error }, { status: 500 });
  }
}