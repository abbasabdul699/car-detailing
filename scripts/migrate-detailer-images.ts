import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateDetailerImages() {
  const detailerImages = await prisma.detailerImage.findMany();

  for (const di of detailerImages) {
    // Check if an Image with the same url and detailerId already exists to avoid duplicates
    const exists = await prisma.image.findFirst({
      where: {
        url: di.url,
        detailerId: di.detailerId,
      },
    });

    if (!exists) {
      await prisma.image.create({
        data: {
          url: di.url,
          alt: di.alt,
          detailerId: di.detailerId,
        },
      });
      console.log(`Migrated: ${di.url}`);
    } else {
      console.log(`Skipped (already exists): ${di.url}`);
    }

    // Delete the DetailerImage document after migration (or skip if you want to keep skipped ones)
    await prisma.detailerImage.delete({
      where: { id: di.id },
    });
    console.log(`Deleted DetailerImage: ${di.id}`);
  }

  console.log('Migration and deletion complete!');
  await prisma.$disconnect();
}

migrateDetailerImages().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
