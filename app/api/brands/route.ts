import { NextResponse } from 'next/server';
import { getEffectiveVehicleCatalog } from '@/lib/serverVehicleCatalogStore';

export async function GET() {
  const catalog = await getEffectiveVehicleCatalog();
  const brands = catalog.manufacturers
    .map((manufacturer) => ({
      name: manufacturer.name,
      logo: manufacturer.logoUrl,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return NextResponse.json(brands);
}
