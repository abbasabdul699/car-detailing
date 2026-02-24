import { DEFAULT_VEHICLE_CATALOG, type VehicleCatalog, type VehicleManufacturer } from '@/lib/vehicleCatalog';

interface NhtsaMake {
  Make_ID: number;
  Make_Name: string;
}

interface NhtsaModel {
  Make_ID: number;
  Make_Name: string;
  Model_ID: number;
  Model_Name: string;
}

const NHTSA_BASE_URL = 'https://vpic.nhtsa.dot.gov/api/vehicles';

const normalizeKey = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.map((v) => v.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function buildLogoUrl(manufacturerName: string): string {
  const fallback = `https://cdn.simpleicons.org/${manufacturerName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
  const existing = DEFAULT_VEHICLE_CATALOG.manufacturers.find(
    (m) => normalizeKey(m.name) === normalizeKey(manufacturerName)
  );
  return existing?.logoUrl || fallback;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Vehicle catalog fetch failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function syncVehicleCatalogFromNhtsa(): Promise<VehicleCatalog> {
  const makesResponse = await fetchJson<{ Results: NhtsaMake[] }>(
    `${NHTSA_BASE_URL}/GetAllMakes?format=json`
  );

  const defaultByName = new Map(
    DEFAULT_VEHICLE_CATALOG.manufacturers.map((manufacturer) => [normalizeKey(manufacturer.name), manufacturer])
  );

  const targetMakes = makesResponse.Results.filter((make) => defaultByName.has(normalizeKey(make.Make_Name)));

  const manufacturers: VehicleManufacturer[] = [];

  for (const make of targetMakes) {
    const modelsResponse = await fetchJson<{ Results: NhtsaModel[] }>(
      `${NHTSA_BASE_URL}/GetModelsForMakeId/${make.Make_ID}?format=json`
    );

    const normalizedName = normalizeKey(make.Make_Name);
    const defaultManufacturer = defaultByName.get(normalizedName);
    const modelNames = uniqueSorted(modelsResponse.Results.map((item) => item.Model_Name));
    const mergedModels = uniqueSorted([...(defaultManufacturer?.models || []), ...modelNames]);

    manufacturers.push({
      name: defaultManufacturer?.name || make.Make_Name,
      slug: (defaultManufacturer?.slug || make.Make_Name).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      logoUrl: buildLogoUrl(defaultManufacturer?.name || make.Make_Name),
      models: mergedModels,
    });
  }

  // Keep defaults that might not be present in API response.
  for (const fallback of DEFAULT_VEHICLE_CATALOG.manufacturers) {
    if (!manufacturers.some((m) => normalizeKey(m.name) === normalizeKey(fallback.name))) {
      manufacturers.push(fallback);
    }
  }

  manufacturers.sort((a, b) => a.name.localeCompare(b.name));

  return {
    manufacturers,
    modelAliases: DEFAULT_VEHICLE_CATALOG.modelAliases,
  };
}

