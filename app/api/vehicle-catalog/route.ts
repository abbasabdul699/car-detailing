import { NextResponse } from 'next/server';
import { getStoredVehicleCatalog } from '@/lib/serverVehicleCatalogStore';
import { DEFAULT_VEHICLE_CATALOG } from '@/lib/vehicleCatalog';

export async function GET() {
  try {
    const stored = await getStoredVehicleCatalog();
    const catalog = stored?.catalog || DEFAULT_VEHICLE_CATALOG;

    return NextResponse.json({
      catalog,
      source: stored?.source || 'local-default',
      sourceVersion: stored?.sourceVersion || 'fallback',
      lastSyncedAt: stored?.lastSyncedAt || null,
      syncStatus: stored?.syncStatus || 'fallback',
    });
  } catch (error) {
    return NextResponse.json({
      catalog: DEFAULT_VEHICLE_CATALOG,
      source: 'local-default',
      sourceVersion: 'fallback',
      lastSyncedAt: null,
      syncStatus: 'fallback',
      error: error instanceof Error ? error.message : 'Failed to load catalog',
    });
  }
}

