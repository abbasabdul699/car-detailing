const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addCategories() {
  try {
    console.log('Adding categories to the database...');
    
    const categories = [
      {
        name: "Interior",
        description: "Interior car detailing services including vacuuming, cleaning, and protection",
        icon: "🪑"
      },
      {
        name: "Exterior", 
        description: "Exterior car detailing services including washing, waxing, and paint protection",
        icon: "🚗"
      },
      {
        name: "Additional",
        description: "Additional specialized car detailing services and treatments",
        icon: "✨"
      }
    ];

    for (const categoryData of categories) {
      try {
        const category = await prisma.category.create({
          data: categoryData
        });
        console.log(`✅ Created category: ${category.name}`);
      } catch (error) {
        if (error.code === 'P2002') {
          console.log(`⚠️  Category "${categoryData.name}" already exists, skipping...`);
        } else {
          console.error(`❌ Error creating category "${categoryData.name}":`, error.message);
        }
      }
    }

    // List all categories
    const allCategories = await prisma.category.findMany({
      orderBy: { name: 'asc' }
    });
    
    console.log('\n📋 All categories in database:');
    allCategories.forEach(category => {
      console.log(`- ${category.name}: ${category.description}`);
    });
    
    console.log(`\n✅ Successfully processed ${categories.length} categories!`);
    
  } catch (error) {
    console.error('❌ Error adding categories:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addCategories();
