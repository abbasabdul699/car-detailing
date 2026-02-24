import { prisma } from '@/lib/prisma';
import { normalizeVehicles } from '@/lib/vehicleValidation';

async function main() {
  const batchSize = 250;
  let skip = 0;
  let updated = 0;
  let unchanged = 0;
  let unresolved = 0;

  while (true) {
    const snapshots = await prisma.customerSnapshot.findMany({
      skip,
      take: batchSize,
      orderBy: { id: 'asc' },
      select: {
        id: true,
        vehicle: true,
        vehicleYear: true,
        vehicleMake: true,
        vehicleModel: true,
        data: true,
      },
    });

    if (snapshots.length === 0) break;

    for (const snapshot of snapshots) {
      const existingData = snapshot.data && typeof snapshot.data === 'object'
        ? (snapshot.data as Record<string, unknown>)
        : {};

      const sourceVehicles = Array.isArray(existingData.vehicles)
        ? existingData.vehicles.filter((v): v is string => typeof v === 'string' && !!v.trim())
        : [snapshot.vehicleModel, snapshot.vehicle].filter((v): v is string => typeof v === 'string' && !!v.trim());

      const normalized = normalizeVehicles(sourceVehicles);
      if (normalized.unresolvedVehicles.length > 0) {
        unresolved += 1;
      }

      const nextVehicle = normalized.vehicle || snapshot.vehicle || null;
      const nextVehicleModel = normalized.vehicleModel || snapshot.vehicleModel || null;
      const nextVehicleMake = normalized.vehicleMake || snapshot.vehicleMake || null;
      const nextVehicleYear = normalized.vehicleYear || snapshot.vehicleYear || null;
      const nextVehicles = normalized.vehicles;

      const currentVehicles = Array.isArray(existingData.vehicles)
        ? existingData.vehicles.filter((v): v is string => typeof v === 'string')
        : [];

      const hasChanged =
        nextVehicle !== (snapshot.vehicle || null) ||
        nextVehicleModel !== (snapshot.vehicleModel || null) ||
        nextVehicleMake !== (snapshot.vehicleMake || null) ||
        nextVehicleYear !== (snapshot.vehicleYear || null) ||
        JSON.stringify(nextVehicles) !== JSON.stringify(currentVehicles);

      if (!hasChanged) {
        unchanged += 1;
        continue;
      }

      await prisma.customerSnapshot.update({
        where: { id: snapshot.id },
        data: {
          vehicle: nextVehicle,
          vehicleModel: nextVehicleModel,
          vehicleMake: nextVehicleMake,
          vehicleYear: nextVehicleYear,
          data: {
            ...existingData,
            vehicles: nextVehicles,
          },
        },
      });
      updated += 1;
    }

    skip += snapshots.length;
    console.log(`Processed ${skip} customer snapshots...`);
  }

  console.log('Vehicle backfill completed.');
  console.log(`Updated: ${updated}`);
  console.log(`Unchanged: ${unchanged}`);
  console.log(`Unresolved: ${unresolved}`);
}

main()
  .catch((error) => {
    console.error('Vehicle backfill failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

