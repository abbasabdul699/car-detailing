import { NextResponse } from 'next/server';
import { getEffectiveVehicleCatalog } from '@/lib/serverVehicleCatalogStore';
import { getManufacturerByName } from '@/lib/vehicleCatalog';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const brandName = searchParams.get('brand');

  if (!brandName) {
    return NextResponse.json({ error: 'Brand name is required' }, { status: 400 });
  }

  const catalog = await getEffectiveVehicleCatalog();
  const brand = getManufacturerByName(brandName, catalog);

  if (!brand) {
    return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
  }

  return NextResponse.json(brand.models || []);
}
