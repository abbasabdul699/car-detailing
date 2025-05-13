// @ts-check
const { prisma } = require('../lib/prisma');
const { MongoClient, ObjectId } = require('mongodb');

const MONGO_URL = process.env.DATABASE_URL!;
const DB_NAME = MONGO_URL.split('/').pop()?.split('?')[0];

async function main() {
  if (!MONGO_URL || !DB_NAME) {
    throw new Error('DATABASE_URL or DB_NAME not set or invalid.');
  }
  const mongo = new MongoClient(MONGO_URL);
  await mongo.connect();
  const db = mongo.db(DB_NAME);
  const detailers = await db.collection('Detailer').find({ services: { $type: 'array' } }).toArray();
  let migratedCount = 0;
  for (const detailer of detailers) {
    const serviceNames: string[] = detailer.services || [];
    for (const name of serviceNames) {
      // Ensure Service exists
      let service = await prisma.service.findUnique({ where: { name } });
      if (!service) {
        service = await prisma.service.create({ data: { name, category: 'Uncategorized' } });
      }
      // Ensure DetailerService exists
      const exists = await prisma.detailerService.findFirst({
        where: { detailerId: detailer._id.toString(), serviceId: service.id },
      });
      if (!exists) {
        await prisma.detailerService.create({
          data: {
            detailerId: detailer._id.toString(),
            serviceId: service.id,
          },
        });
      }
    }
    // Remove the old services array
    await db.collection('Detailer').updateOne(
      { _id: detailer._id },
      { $unset: { services: '' } }
    );
    migratedCount++;
    console.log(`Migrated detailer: ${detailer.businessName}`);
  }
  await mongo.close();
  await prisma.$disconnect();
  console.log(`\nMigration complete. Migrated ${migratedCount} detailers.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}); 