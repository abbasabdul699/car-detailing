import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from '@/lib/prisma';

// GET: Fetch all bundles for the logged-in detailer
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const detailerId = (session.user as any).id;
    const bundles = await prisma.bundle.findMany({
      where: { detailerId: detailerId },
      include: {
        services: {
          include: {
            service: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(bundles);
  } catch (error) {
    console.error("Failed to fetch bundles:", error);
    return NextResponse.json({ error: 'Failed to fetch bundles' }, { status: 500 });
  }
}

// POST: Create a new bundle for the logged-in detailer
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name, description, price, serviceIds, imageUrl } = await request.json();

    if (!name || !serviceIds || !Array.isArray(serviceIds)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newBundle = await prisma.bundle.create({
      data: {
        name,
        description,
        price,
        imageUrl,
        detailerId: session.user.id,
        services: {
          create: serviceIds.map((serviceId: string) => ({
            service: {
              connect: { id: serviceId },
            },
          })),
        },
      },
      include: {
        services: {
          include: {
            service: true,
          },
        },
      },
    });

    return NextResponse.json(newBundle, { status: 201 });
  } catch (error) {
    console.error("Failed to create bundle:", error);
    return NextResponse.json({ error: 'Failed to create bundle' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const bundleId = searchParams.get('id');

  if (!bundleId) {
    return new NextResponse(JSON.stringify({ error: 'Bundle ID is required' }), { status: 400 });
  }

  try {
    const { name, description, price, serviceIds, imageUrl } = await req.json();

    if (!name || !price || !serviceIds || !Array.isArray(serviceIds)) {
      return new NextResponse(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    // First, remove existing services for this bundle
    await prisma.bundleService.deleteMany({
      where: { bundleId: bundleId },
    });

    // Then, create the updated bundle with new services
    const updatedBundle = await prisma.bundle.update({
      where: { id: bundleId },
      data: {
        name,
        description,
        price,
        imageUrl,
        services: {
          create: serviceIds.map((serviceId: string) => ({
            service: {
              connect: { id: serviceId },
            },
          })),
        },
      },
      include: {
        services: {
          include: {
            service: true,
          },
        },
      },
    });

    return new NextResponse(JSON.stringify(updatedBundle), { status: 200 });

  } catch (error) {
    console.error("Error updating bundle:", error);
    if (error instanceof Error) {
        return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 });
    }
    return new NextResponse(JSON.stringify({ error: 'An unknown error occurred' }), { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
  
    const { searchParams } = new URL(req.url);
    const bundleId = searchParams.get('id');
  
    if (!bundleId) {
      return new NextResponse(JSON.stringify({ error: 'Bundle ID is required' }), { status: 400 });
    }
  
    try {
      // Need to delete associated BundleService records first due to relations
      await prisma.bundleService.deleteMany({
        where: { bundleId: bundleId },
      });
      
      // Then delete the bundle itself
      await prisma.bundle.delete({
        where: { id: bundleId },
      });
  
      return new NextResponse(JSON.stringify({ message: "Bundle deleted successfully" }), { status: 200 });
  
    } catch (error) {
      console.error("Error deleting bundle:", error);
      if (error instanceof Error) {
        return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 });
    }
    return new NextResponse(JSON.stringify({ error: 'An unknown error occurred' }), { status: 500 });
    }
  } 