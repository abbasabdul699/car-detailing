import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting database seeding...')

  // Clear existing data
  await prisma.detailer.deleteMany({})
  console.log('Cleared existing data')

  const detailers = [
    {
      name: "Uncle Mike's Detailing",
      email: "mike@unclemikes.com",
      phone: "(555) 123-4567",
      address: "123 Main St",
      city: "San Francisco",
      state: "CA",
      zipCode: "94105",
      description: "Professional mobile detailing service with over 10 years of experience. We come to you!",
      latitude: 37.7749,
      longitude: -122.4194,
      priceRange: "$$",
      images: ["/images/detailers/uncle-mike-1.jpg"],
      services: ["Basic Wash", "Full Detail", "Paint Correction"]
    },
    {
      name: "DF Detailing",
      email: "info@dfdetailing.com",
      phone: "(555) 234-5678",
      address: "456 Market St",
      city: "San Francisco",
      state: "CA",
      zipCode: "94105",
      description: "Expert mobile detailing services. Satisfaction guaranteed!",
      latitude: 37.7899,
      longitude: -122.4001,
      priceRange: "$",
      images: ["/images/detailers/df-1.jpg"],
      services: ["Basic Wash", "Interior Detail", "Ceramic Coating"]
    },
    {
      name: "Pay Attention To Detail",
      email: "contact@payattention.com",
      phone: "(555) 345-6789",
      address: "789 Mission St",
      city: "San Francisco",
      state: "CA",
      zipCode: "94105",
      description: "Professional detailing with attention to every detail. Premium service at competitive prices.",
      latitude: 37.7855,
      longitude: -122.4100,
      priceRange: "$$$",
      images: ["/images/detailers/pay-attention-1.jpg"],
      services: ["Full Detail", "Paint Correction", "Ceramic Coating"]
    },
    {
      name: "Jay's Mobile Detailing",
      email: "jay@jaysdetailing.com",
      phone: "(555) 456-7890",
      address: "321 Howard St",
      city: "San Francisco",
      state: "CA",
      zipCode: "94105",
      description: "Mobile detailing service that comes to you. Quality work at affordable prices.",
      latitude: 37.7891,
      longitude: -122.3968,
      priceRange: "$$",
      images: ["/images/detailers/jays-1.jpg"],
      services: ["Basic Wash", "Full Detail", "Interior Detail"]
    }
  ]

  for (const detailer of detailers) {
    try {
      const created = await prisma.detailer.create({
        data: detailer
      })
      console.log(`Created detailer: ${created.name}`)
    } catch (error) {
      console.error(`Error creating detailer ${detailer.name}:`, error)
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