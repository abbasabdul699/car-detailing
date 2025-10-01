const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addBundles() {
  try {
    console.log('Adding bundles to the database...');

    // Get the first detailer to associate bundles with
    const detailer = await prisma.detailer.findFirst();
    if (!detailer) {
      console.error('❌ No detailer found. Please create a detailer first.');
      return;
    }
    console.log(`Using detailer: ${detailer.businessName} (ID: ${detailer.id})`);

    // First, let's get all services to reference them
    const allServices = await prisma.service.findMany();
    const serviceMap = {};
    allServices.forEach(service => {
      serviceMap[service.name.toLowerCase()] = service.id;
    });

    console.log(`Found ${allServices.length} services to work with`);

    // Define the bundles
    const bundles = [
      {
        name: "Interior Cleaning",
        description: "Complete interior detailing package including vacuuming, cleaning, and protection",
        price: 200.00, // Base price
        services: [
          "Vacuuming",
          "Carpet & Upholstery Shampooing & Steaming",
          "Leather Cleaning & Conditioning",
          "Dashboard, Console & Door Panel Cleaning",
          "Window & Mirror Cleaning (Interior)",
          "Odor Elimination",
          "Door Jamb Cleaning"
        ]
      },
      {
        name: "Exterior Cleaning",
        description: "Complete exterior detailing package including washing, waxing, and protection",
        price: 160.00, // Base price
        services: [
          "Hand Wash & Dry",
          "Waxing & Polishing",
          "Clay Bar Treatment",
          "Tire Cleaning & Dressing",
          "Wheel & Rim Detailing",
          "Bug & Tar Removal",
          "Trim Restoration",
          "Door Jamb Cleaning"
        ]
      },
      {
        name: "Full Detailing",
        description: "Complete interior and exterior detailing package - the ultimate car care experience",
        price: 325.00, // Base price
        services: [
          // Interior services
          "Vacuuming",
          "Carpet & Upholstery Shampooing & Steaming",
          "Leather Cleaning & Conditioning",
          "Dashboard, Console & Door Panel Cleaning",
          "Window & Mirror Cleaning (Interior)",
          "Odor Elimination",
          "Door Jamb Cleaning",
          // Exterior services
          "Hand Wash & Dry",
          "Waxing & Polishing",
          "Clay Bar Treatment",
          "Tire Cleaning & Dressing",
          "Wheel & Rim Detailing",
          "Bug & Tar Removal",
          "Trim Restoration"
        ]
      }
    ];

    for (const bundleData of bundles) {
      try {
        // Create the bundle
        const bundle = await prisma.bundle.create({
          data: {
            name: bundleData.name,
            description: bundleData.description,
            price: bundleData.price,
            detailerId: detailer.id
          }
        });

        console.log(`✅ Created bundle: ${bundle.name} ($${bundle.price})`);

        // Add services to the bundle
        let serviceCount = 0;
        for (const serviceName of bundleData.services) {
          const serviceId = serviceMap[serviceName.toLowerCase()];
          if (serviceId) {
            try {
              await prisma.bundleService.create({
                data: {
                  bundleId: bundle.id,
                  serviceId: serviceId
                }
              });
              serviceCount++;
            } catch (error) {
              if (error.code === 'P2002') {
                console.log(`  ⚠️  Service "${serviceName}" already in bundle, skipping...`);
              } else {
                console.error(`  ❌ Error adding service "${serviceName}" to bundle:`, error.message);
              }
            }
          } else {
            console.log(`  ⚠️  Service "${serviceName}" not found in database, skipping...`);
          }
        }

        console.log(`  📋 Added ${serviceCount} services to ${bundle.name}`);

      } catch (error) {
        if (error.code === 'P2002') {
          console.log(`⚠️  Bundle "${bundleData.name}" already exists, skipping...`);
        } else {
          console.error(`❌ Error creating bundle "${bundleData.name}":`, error.message);
        }
      }
    }

    // Show summary of all bundles
    console.log('\n📊 Bundle Summary:');
    const allBundles = await prisma.bundle.findMany({
      include: {
        services: {
          include: {
            service: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    allBundles.forEach(bundle => {
      console.log(`\n🎁 ${bundle.name}:`);
      console.log(`   Description: ${bundle.description}`);
      console.log(`   Price: $${bundle.price}`);
      console.log(`   Services (${bundle.services.length}):`);
      bundle.services.forEach(bundleService => {
        console.log(`     - ${bundleService.service.name}`);
      });
    });

    console.log(`\n✅ Successfully processed ${bundles.length} bundles!`);
    
  } catch (error) {
    console.error('❌ Error adding bundles:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addBundles();
