import { NextRequest, NextResponse } from 'next/server';
import { syncVehicleCatalogFromNhtsa } from '@/lib/vehicleCatalogSync';
import { upsertVehicleCatalog } from '@/lib/serverVehicleCatalogStore';
import { DEFAULT_VEHICLE_CATALOG } from '@/lib/vehicleCatalog';

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const tokenParam = request.nextUrl.searchParams.get('token');
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return authHeader === `Bearer ${secret}` || tokenParam === secret;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const catalog = await syncVehicleCatalogFromNhtsa();
    await upsertVehicleCatalog({
      catalog,
      source: 'nhtsa-vpic',
      sourceVersion: new Date().toISOString().slice(0, 10),
      syncStatus: 'success',
    });
    return NextResponse.json({
      success: true,
      manufacturers: catalog.manufacturers.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown sync failure';
    await upsertVehicleCatalog({
      catalog: DEFAULT_VEHICLE_CATALOG,
      source: 'nhtsa-vpic',
      sourceVersion: new Date().toISOString().slice(0, 10),
      syncStatus: 'failed',
      syncError: message,
    }).catch(() => undefined);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}

