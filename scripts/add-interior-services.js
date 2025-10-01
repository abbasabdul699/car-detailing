const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addInteriorServices() {
  try {
    console.log('Adding Interior services to the database...');

    // Find the "Interior" category
    const interiorCategory = await prisma.category.findUnique({
      where: { name: 'Interior' },
    });

    if (!interiorCategory) {
      console.error('Error: "Interior" category not found. Please ensure it exists.');
      return;
    }

    console.log(`Found Interior category with ID: ${interiorCategory.id}`);

    const services = [
      {
        name: "Vacuuming",
        description: "Thorough vacuum of seats, carpets, mats, and trunk.",
        priceRange: "$30-50",
        duration: 30,
        categoryId: interiorCategory.id,
      },
      {
        name: "Carpet & Upholstery Shampooing & Steaming",
        description: "Removes stains and odors from carpets and upholstery.",
        priceRange: "$80-120",
        duration: 90,
        categoryId: interiorCategory.id,
      },
      {
        name: "Leather Cleaning & Conditioning",
        description: "Protects and hydrates leather surfaces.",
        priceRange: "$60-100",
        duration: 60,
        categoryId: interiorCategory.id,
      },
      {
        name: "Dashboard, Console & Door Panel Cleaning",
        description: "Dusting and disinfecting of all interior surfaces.",
        priceRange: "$40-70",
        duration: 45,
        categoryId: interiorCategory.id,
      },
      {
        name: "Window & Mirror Cleaning (Interior)",
        description: "Streak-free cleaning of all interior glass surfaces.",
        priceRange: "$25-45",
        duration: 30,
        categoryId: interiorCategory.id,
      },
      {
        name: "Odor Elimination",
        description: "May include ozone treatment or fragrance application.",
        priceRange: "$50-100",
        duration: 60,
        categoryId: interiorCategory.id,
      },
      {
        name: "Stain Removal",
        description: "Focused treatment on tough interior stains.",
        priceRange: "$40-80",
        duration: 45,
        categoryId: interiorCategory.id,
      },
      {
        name: "Door Jamb Cleaning",
        description: "Cleans hidden dirt and grime in the door frame area.",
        priceRange: "$30-50",
        duration: 30,
        categoryId: interiorCategory.id,
      },
      {
        name: "Pet Hair Removal",
        description: "Specialized tools used to remove embedded fur.",
        priceRange: "$45-75",
        duration: 45,
        categoryId: interiorCategory.id,
      },
      {
        name: "Vomit Clean Up",
        description: "Removes the vomit from the interior and the smell.",
        priceRange: "$80-150",
        duration: 90,
        categoryId: interiorCategory.id,
      }
    ];

    for (const serviceData of services) {
      try {
        const service = await prisma.service.upsert({
          where: { name: serviceData.name },
          update: serviceData,
          create: serviceData,
        });
        console.log(`✅ Upserted service: ${service.name} (${service.priceRange}, ${service.duration}min)`);
      } catch (error) {
        console.error(`❌ Error upserting service ${serviceData.name}:`, error);
      }
    }

    // List all services in the Interior category
    const interiorServices = await prisma.service.findMany({
      where: { categoryId: interiorCategory.id },
      orderBy: { name: 'asc' }
    });
    
    console.log(`\n📋 All services in Interior category (${interiorServices.length} total):`);
    interiorServices.forEach(service => {
      console.log(`- ${service.name}: ${service.priceRange} (${service.duration}min)`);
    });

    console.log('\n✅ Interior services added successfully!');
    
  } catch (error) {
    console.error('❌ Error adding interior services:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addInteriorServices();
