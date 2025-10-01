const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addExteriorServices() {
  try {
    console.log('Adding Exterior services to the database...');

    // Find the "Exterior" category
    const exteriorCategory = await prisma.category.findUnique({
      where: { name: 'Exterior' },
    });

    if (!exteriorCategory) {
      console.error('Error: "Exterior" category not found. Please ensure it exists.');
      return;
    }

    console.log(`Found Exterior category with ID: ${exteriorCategory.id}`);

    const services = [
      {
        name: "Hand Wash & Dry",
        description: "Gentle cleaning using premium soap and microfiber towels.",
        priceRange: "$40-70",
        duration: 60,
        categoryId: exteriorCategory.id,
      },
      {
        name: "Waxing & Polishing",
        description: "Adds shine and protects paint; may include machine polish or hand wax.",
        priceRange: "$80-150",
        duration: 120,
        categoryId: exteriorCategory.id,
      },
      {
        name: "Door Jamb Cleaning",
        description: "Cleans hidden dirt and grime in the door frame area.",
        priceRange: "$30-50",
        duration: 30,
        categoryId: exteriorCategory.id,
      },
      {
        name: "Tire Cleaning & Dressing",
        description: "Restores black finish and adds shine to tires.",
        priceRange: "$25-45",
        duration: 30,
        categoryId: exteriorCategory.id,
      },
      {
        name: "Wheel & Rim Detailing",
        description: "Deep clean of brake dust, grime, and debris.",
        priceRange: "$40-80",
        duration: 60,
        categoryId: exteriorCategory.id,
      },
      {
        name: "Engine Bay Cleaning",
        description: "Degreases and restores engine components (optional).",
        priceRange: "$50-90",
        duration: 75,
        categoryId: exteriorCategory.id,
      },
      {
        name: "Trim Restoration",
        description: "Rejuvenates faded plastic or rubber trim.",
        priceRange: "$40-70",
        duration: 45,
        categoryId: exteriorCategory.id,
      },
      {
        name: "Clay Bar Treatment",
        description: "Removes surface contaminants for a smooth finish.",
        priceRange: "$80-120",
        duration: 90,
        categoryId: exteriorCategory.id,
      },
      {
        name: "Bug & Tar Removal",
        description: "Targets sticky contaminants on the bumper or grille.",
        priceRange: "$50-90",
        duration: 60,
        categoryId: exteriorCategory.id,
      },
      {
        name: "Paint Correction",
        description: "Removes swirl marks, oxidation, and minor scratches.",
        priceRange: "$200-400",
        duration: 180,
        categoryId: exteriorCategory.id,
      },
      {
        name: "Ceramic Coating",
        description: "Long-term protection and enhanced gloss.",
        priceRange: "$400-700",
        duration: 300,
        categoryId: exteriorCategory.id,
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

    // List all services in the Exterior category
    const exteriorServices = await prisma.service.findMany({
      where: { categoryId: exteriorCategory.id },
      orderBy: { name: 'asc' }
    });
    
    console.log(`\n📋 All services in Exterior category (${exteriorServices.length} total):`);
    exteriorServices.forEach(service => {
      console.log(`- ${service.name}: ${service.priceRange} (${service.duration}min)`);
    });

    console.log('\n✅ Exterior services added successfully!');
    
  } catch (error) {
    console.error('❌ Error adding exterior services:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addExteriorServices();
