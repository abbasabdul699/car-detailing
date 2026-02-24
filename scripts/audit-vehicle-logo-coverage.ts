import { prisma } from '@/lib/prisma';
import {
  DEFAULT_VEHICLE_CATALOG,
  getManufacturerForModel,
  getManufacturerLogo,
} from '@/lib/vehicleCatalog';

function normalize(value: string): string {
  return value.trim();
}

async function main() {
  const rows = await prisma.customerSnapshot.findMany({
    select: {
      id: true,
      vehicle: true,
      vehicleModel: true,
      vehicleMake: true,
      data: true,
    },
  });

  let totalCustomers = 0;
  let customersWithVehicle = 0;
  let resolvableVehicleEntries = 0;
  let vehicleEntriesWithLogo = 0;
  let unresolvedVehicleEntries = 0;

  const unresolvedMap = new Map<string, number>();
  const makeMismatches = new Map<string, number>();

  for (const row of rows) {
    totalCustomers += 1;
    const data =
      row.data && typeof row.data === 'object'
        ? (row.data as Record<string, unknown>)
        : {};

    const vehiclesFromArray = Array.isArray(data.vehicles)
      ? data.vehicles.filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
      : [];

    const candidates =
      vehiclesFromArray.length > 0
        ? vehiclesFromArray
        : [row.vehicleModel, row.vehicle].filter(
            (v): v is string => typeof v === 'string' && v.trim().length > 0
          );

    if (candidates.length === 0) continue;
    customersWithVehicle += 1;

    const seen = new Set<string>();
    for (const raw of candidates) {
      const model = normalize(raw);
      if (!model || seen.has(model)) continue;
      seen.add(model);

      const make = getManufacturerForModel(model, DEFAULT_VEHICLE_CATALOG);
      if (!make) {
        unresolvedVehicleEntries += 1;
        unresolvedMap.set(model, (unresolvedMap.get(model) || 0) + 1);
        continue;
      }

      resolvableVehicleEntries += 1;
      const logo = getManufacturerLogo(make, DEFAULT_VEHICLE_CATALOG);
      if (logo) {
        vehicleEntriesWithLogo += 1;
      }

      const storedMake = (row.vehicleMake || '').trim();
      if (storedMake && storedMake.toLowerCase() !== make.toLowerCase()) {
        const key = `${storedMake} -> ${make}`;
        makeMismatches.set(key, (makeMismatches.get(key) || 0) + 1);
      }
    }
  }

  const topUnresolved = [...unresolvedMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 40);
  const topStoredMakeMismatches = [...makeMismatches.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25);

  console.log(
    JSON.stringify(
      {
        totalCustomers,
        customersWithVehicle,
        resolvableVehicleEntries,
        vehicleEntriesWithLogo,
        unresolvedVehicleEntries,
        topUnresolved,
        topStoredMakeMismatches,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
