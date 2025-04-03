import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Clear existing data
  await prisma.detailer.deleteMany({})

  const detailers = [
    {
      name: "Uncle Mike's Detailing",
      email: "mike@unclemikes.com",
      phone: "(555) 123-4567",
      address: "123 Main St",
      city: "San Francisco",
      state: "CA",
      zipCode: "94105",
      description: "Professional mobile detailing service with over 10 years of experience",
      latitude: 37.7749,
      longitude: -122.4194,
      priceRange: "$$",
      images: [
        { url: "/images/detailers/uncle-mike-1.jpg", alt: "Detailing work" },
        { url: "/images/detailers/uncle-mike-2.jpg", alt: "Shop front" }
      ],
      services: [
        { name: "Basic Wash", price: 50 },
        { name: "Full Detail", price: 200 }
      ]
    },
    {
      name: "DF Detailing",
      email: "df@detailing.com",
      phone: "857-243-5290",
      address: "21 Manville Hill Road",
      city: "Cumberland",
      state: "RI",
      zipCode: "02864",
      description: "Expert mobile detailing services",
      latitude: 41.973911,
      longitude: -71.466899,
      priceRange: "$",
      images: [
        {
          url: "/images/detailers/dfdetailing.jpg",
          alt: "DF Detailing Work"
        }
      ],
      services: [
        {
          name: "Full Detail",
          price: "200",
          description: "Complete interior and exterior detailing"
        }
      ]
    },
    {
      name: "Pay Attention To Detail",
      email: "payattention@detailing.com",
      phone: "857-244-1516",
      address: "20 Parkman St",
      city: "Dorchester",
      state: "MA",
      zipCode: "02122",
      description: "Professional detailing with exceptional attention to detail",
      latitude: 42.28093,
      longitude: -71.237755,
      priceRange: "$",
      images: [
        {
          url: "/images/detailers/payattention.jpg",
          alt: "Pay Attention To Detail"
        }
      ],
      services: [
        {
          name: "Premium Detail",
          price: "299.99",
          description: "Full interior and exterior detail"
        }
      ]
    },
    {
      name: "Jay's Mobile Auto Detail",
      email: "jay@detailing.com",
      phone: "401-678-9226",
      address: "1634 Elmwood Ave",
      city: "Cranston",
      state: "RI",
      zipCode: "02910",
      description: "Professional mobile detailing service",
      latitude: 41.763360,
      longitude: -71.425069,
      priceRange: "$",
      images: [
        {
          url: "/images/detailers/jaymobile.jpg",
          alt: "Jay's Mobile Auto Detail Work"
        }
      ],
      services: [
        {
          name: "Full Detail",
          price: "250",
          description: "Complete interior and exterior detailing"
        }
      ]
    },
    {
      name: "Josh's Mobile Detailing Service",
      email: "josh@detailing.com",
      phone: "860-771-3294",
      address: "8 Hope St",
      city: "Attleboro",
      state: "MA",
      zipCode: "02703",
      description: "Quality mobile detailing services",
      latitude: 41.948652,
      longitude: -71.280639,
      priceRange: "$",
      images: [
        {
          url: "/images/detailers/joshmobile.jpg",
          alt: "Josh's Mobile Detailing Work"
        }
      ],
      services: [
        {
          name: "Premium Detail",
          price: "275",
          description: "Full interior and exterior detail"
        }
      ]
    }
  ]

  // Create detailers
  for (const detailer of detailers) {
    await prisma.detailer.create({
      data: detailer
    })
  }

  console.log('Database has been seeded!')
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 