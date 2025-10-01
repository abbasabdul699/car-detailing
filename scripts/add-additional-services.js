const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addAdditionalServices() {
  try {
    console.log('Adding additional services to the database...');

    // Find the "Additional" category
    const additionalCategory = await prisma.category.findUnique({
      where: { name: 'Additional' },
    });

    if (!additionalCategory) {
      console.error('Error: "Additional" category not found. Please ensure it exists.');
      return;
    }

    console.log(`Found Additional category with ID: ${additionalCategory.id}`);

    const services = [
      {
        name: "Bug & Tar Removal",
        description: "Remove tough bug and tar spots for a flawless finish.",
        priceRange: "$50-90",
        duration: 60, // in minutes
        categoryId: additionalCategory.id,
      },
      {
        name: "Car Seat Cleaning",
        description: "Deep-clean seats for a fresh, comfortable ride.",
        priceRange: "$60-100",
        duration: 75,
        categoryId: additionalCategory.id,
      },
      {
        name: "Ceramic Coating",
        description: "Ultimate shine and protection that lasts.",
        priceRange: "$400-700",
        duration: 300,
        categoryId: additionalCategory.id,
      },
      {
        name: "Clay Bar Treatment",
        description: "Smooth, contaminant-free paint for a glassy look.",
        priceRange: "$80-120",
        duration: 90,
        categoryId: additionalCategory.id,
      },
      {
        name: "Dog Hair Removal",
        description: "Eliminate stubborn pet hair from every corner.",
        priceRange: "$55-95",
        duration: 75,
        categoryId: additionalCategory.id,
      },
      {
        name: "Engine Bay Cleaning",
        description: "Make your engine look showroom new.",
        priceRange: "$40-80",
        duration: 45,
        categoryId: additionalCategory.id,
      },
      {
        name: "Headlight Restoration",
        description: "Brighten and clear up foggy headlights.",
        priceRange: "$80-150",
        duration: 90,
        categoryId: additionalCategory.id,
      },
      {
        name: "Mold Removal",
        description: "Remove mold for a healthier, odor-free ride.",
        priceRange: "$170-280",
        duration: 180,
        categoryId: additionalCategory.id,
      },
      {
        name: "Odor Removal",
        description: "Neutralize and remove unwanted odors.",
        priceRange: "$100-160",
        duration: 90,
        categoryId: additionalCategory.id,
      },
    ];

    for (const serviceData of services) {
      try {
        const service = await prisma.service.upsert({
          where: { name: serviceData.name }, // Use upsert to avoid duplicates if run multiple times
          update: serviceData,
          create: serviceData,
        });
        console.log(`✅ Upserted service: ${service.name} (${service.priceRange}, ${service.duration}min)`);
      } catch (error) {
        console.error(`❌ Error upserting service ${serviceData.name}:`, error);
      }
    }

    // List all services in the Additional category
    const additionalServices = await prisma.service.findMany({
      where: { categoryId: additionalCategory.id },
      orderBy: { name: 'asc' }
    });
    
    console.log(`\n📋 All services in Additional category (${additionalServices.length} total):`);
    additionalServices.forEach(service => {
      console.log(`- ${service.name}: ${service.priceRange} (${service.duration}min)`);
    });

    console.log('\n✅ Additional services added successfully!');
    
  } catch (error) {
    console.error('❌ Error adding additional services:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addAdditionalServices();
