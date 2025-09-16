const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const detailer = await prisma.detailer.findFirst();
  if (detailer) {
    console.log(`Found detailer with ID: ${detailer.id}`);
  } else {
    console.log('No detailers found in the database.');
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 