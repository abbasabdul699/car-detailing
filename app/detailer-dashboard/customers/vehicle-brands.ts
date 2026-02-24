import { DEFAULT_VEHICLE_CATALOG, getManufacturerForModel, getVehicleBrandMap } from '@/lib/vehicleCatalog';

// Vehicle brand-to-model mapping for picker/dropdowns.
export const VEHICLE_BY_BRAND: Record<string, string[]> = getVehicleBrandMap(DEFAULT_VEHICLE_CATALOG);

// Reverse lookup: given a model name, find the brand.
export function getBrandForModel(model: string): string | null {
  return getManufacturerForModel(model, DEFAULT_VEHICLE_CATALOG);
}
