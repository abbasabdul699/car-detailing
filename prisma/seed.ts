import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting database seeding...')

  const detailers = [
      {
        businessName: "Wellesley Car Detailing",
        email: "wellesleycardetailing@gmail.com",
        phone: "(617) 564-4340",
        address: "275 Grove St #2400",
        city: "Auburndale",
        state: "MA",
        zipCode: "02466",
        description: "Welcome to Wellesley Car Detailing, your top choice for all things car care in Wellesley, MA. As a trusted mobile detailing service, we’re proud to be locally owned and operated, bringing high-quality detailing straight to your door.",
        latitude: 42.3389,
        longitude: -71.2530,
        priceRange: "$$",
        website: "https://wellesleycardetailing.com/",
        services: ["Vacuuming", "Carpet & Upholstery Shampooing & Steaming", "Leather Cleaning & Conditioning","Dashboard, Console & Door Panel Cleaning","Window & Mirror Cleaning","Odor Elimination","Hand Wash & Dry", "Waxing & Polishing", "Clay Bar Treatment","Tire Cleaning & Dressing", "Wheel & Rim Detailing", "Door Jamb Cleaning", "Trim Restoration", "Paint Correction", "Overspray Removal", "Headlight Restoration", "Limescale Removal", "Car Seat Cleaning", "Pet Hair Removal", "Vomit Clean Up", "Paint Correction", "Ceramic Coating "],

        images: {
          create: [
            {
              url: "/images/detailers/wellesley-detailing.jpg",
              alt: "Wellesley Car Detailing"
            }
          ]
        }
      }
  ]

  for (const detailerData of detailers) {
    try {
      const created = await prisma.detailer.create({
        data: detailerData as any, // temporary type assertion to fix TypeScript error
        include: {
          images: true
        }
      })
      console.log(`Created detailer: ${created.businessName}`)
    } catch (error) {
      console.error(`Error creating detailer ${detailerData.businessName}:`, error)
    }
  }

  const count = await prisma.detailer.count()
  console.log(`Database seeding completed! Created ${count} detailers`)
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 