import { connectToDatabase } from '@/lib/mongodb';
import { DEFAULT_VEHICLE_CATALOG, type VehicleCatalog } from '@/lib/vehicleCatalog';

const COLLECTION = 'vehicleCatalog';
const ACTIVE_DOC_ID = 'active';

interface StoredVehicleCatalogDoc {
  _id: string;
  catalog: VehicleCatalog;
  source: string;
  sourceVersion: string;
  lastSyncedAt: string;
  syncStatus: 'success' | 'failed';
  syncError?: string;
}

export async function getStoredVehicleCatalog(): Promise<StoredVehicleCatalogDoc | null> {
  const db = await connectToDatabase();
  const collection = db.collection<StoredVehicleCatalogDoc>(COLLECTION);
  return collection.findOne({ _id: ACTIVE_DOC_ID });
}

export async function getEffectiveVehicleCatalog(): Promise<VehicleCatalog> {
  const stored = await getStoredVehicleCatalog();
  return stored?.catalog || DEFAULT_VEHICLE_CATALOG;
}

export async function upsertVehicleCatalog(payload: {
  catalog: VehicleCatalog;
  source: string;
  sourceVersion: string;
  syncStatus: 'success' | 'failed';
  syncError?: string;
}): Promise<void> {
  const db = await connectToDatabase();
  const collection = db.collection<StoredVehicleCatalogDoc>(COLLECTION);

  await collection.updateOne(
    { _id: ACTIVE_DOC_ID },
    {
      $set: {
        catalog: payload.catalog,
        source: payload.source,
        sourceVersion: payload.sourceVersion,
        syncStatus: payload.syncStatus,
        syncError: payload.syncError,
        lastSyncedAt: new Date().toISOString(),
      },
    },
    { upsert: true }
  );
}

