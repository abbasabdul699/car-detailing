import { isProfileComplete } from '@/lib/profileCompletion';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat') || '0');
    const lng = parseFloat(searchParams.get('lng') || '0');
    const radius = parseInt(searchParams.get('radius') || '50');

    // Fetch detailers within radius
    const detailers = await prisma.detailer.findMany({
      where: {
        // Your existing location query
      },
      include: {
        services: true,
        businessHours: true,
        images: true,
      }
    });

    // Filter out incomplete profiles
    const completeDetailers = detailers.filter(detailer => isProfileComplete(detailer));

    return NextResponse.json(completeDetailers);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch detailers' },
      { status: 500 }
    );
  }
} 