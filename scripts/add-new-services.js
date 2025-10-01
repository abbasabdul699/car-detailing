const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addNewServices() {
  try {
    console.log('Adding new services to the database (checking for duplicates)...');

    // Get all categories
    const categories = await prisma.category.findMany();
    const categoryMap = {};
    categories.forEach(cat => {
      categoryMap[cat.name.toLowerCase()] = cat.id;
    });

    console.log('Found categories:', Object.keys(categoryMap));

    // Get existing services to avoid duplicates
    const existingServices = await prisma.service.findMany();
    const existingServiceNames = new Set(existingServices.map(s => s.name.toLowerCase()));
    
    console.log(`Found ${existingServices.length} existing services`);

    // New services to add (extracted from your list, removing duplicates)
    const newServices = [
      // Interior services
      {
        name: "Carpet & Upholstery Shampooing",
        description: "Removes stains and odors from carpets and upholstery.",
        priceRange: "$70-110",
        duration: 75,
        category: "interior"
      },
      {
        name: "Paint Sealant or Ceramic Coating",
        description: "Long-term protection and enhanced gloss.",
        priceRange: "$350-600",
        duration: 240,
        category: "exterior"
      },
      {
        name: "Overspray Removal",
        description: "Removes paint overspray and contamination from vehicle surfaces.",
        priceRange: "$120-200",
        duration: 120,
        category: "additional"
      },
      {
        name: "Tree Sap Removal",
        description: "Specialized removal of tree sap and sticky residues.",
        priceRange: "$60-100",
        duration: 60,
        category: "additional"
      },
      {
        name: "Limescale Removal",
        description: "Removes hard water deposits and limescale buildup.",
        priceRange: "$80-140",
        duration: 90,
        category: "additional"
      },
      {
        name: "Scratch Removal",
        description: "Repairs minor scratches and paint imperfections.",
        priceRange: "$100-250",
        duration: 120,
        category: "additional"
      }
    ];

    let addedCount = 0;
    let skippedCount = 0;

    for (const serviceData of newServices) {
      const serviceName = serviceData.name.toLowerCase();
      
      if (existingServiceNames.has(serviceName)) {
        console.log(`⚠️  Skipping "${serviceData.name}" - already exists`);
        skippedCount++;
        continue;
      }

      const categoryId = categoryMap[serviceData.category];
      if (!categoryId) {
        console.error(`❌ Category "${serviceData.category}" not found for service "${serviceData.name}"`);
        continue;
      }

      try {
        const service = await prisma.service.create({
          data: {
            name: serviceData.name,
            description: serviceData.description,
            priceRange: serviceData.priceRange,
            duration: serviceData.duration,
            categoryId: categoryId
          }
        });
        console.log(`✅ Added new service: ${service.name} (${service.priceRange}, ${service.duration}min) - ${serviceData.category}`);
        addedCount++;
      } catch (error) {
        console.error(`❌ Error adding service "${serviceData.name}":`, error.message);
      }
    }

    // Show summary
    console.log(`\n📊 Summary:`);
    console.log(`- New services added: ${addedCount}`);
    console.log(`- Duplicates skipped: ${skippedCount}`);
    console.log(`- Total services processed: ${newServices.length}`);

    // Show all services by category
    console.log(`\n📋 Current services by category:`);
    for (const categoryName of Object.keys(categoryMap)) {
      const services = await prisma.service.findMany({
        where: { categoryId: categoryMap[categoryName] },
        orderBy: { name: 'asc' }
      });
      console.log(`\n${categoryName.toUpperCase()} (${services.length} services):`);
      services.forEach(service => {
        console.log(`  - ${service.name}: ${service.priceRange} (${service.duration}min)`);
      });
    }

    console.log('\n✅ Service addition completed!');
    
  } catch (error) {
    console.error('❌ Error adding new services:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addNewServices();
