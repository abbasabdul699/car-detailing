import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log(`Start seeding ...`);
  
  // Move the password hashing inside the async function
  const hashedPassword = await bcrypt.hash('password123', 10);

  const detailerData = [
    {
      businessName: "Uncle Mike's Mobile Auto Detailing Service US Navy Veteran",
      email: "unclemike@detailing.com",
      password: hashedPassword,  // Use the hashed password here
      phone: "508-982-0451",
      address: "124 Pine St",
      city: "Attleboro",
      state: "MA",
      zipCode: "02703",
      latitude: 42.4440,
      longitude: -76.5019,
      isMobile: true,
      serviceRadius: 30,
      specialties: ["Ceramic Coating", "Paint Correction"],
      googleRating: 4.9,
      priceRange: "$$",
      totalReviews: 0,
      services: {
        create: [
          {
            name: "Premium Detail",
            description: "Full interior and exterior detail",
            price: 299.99,
            duration: 240
          },
          {
            name: "Ceramic Coating",
            description: "Professional ceramic coating application",
            price: 999.99,
            duration: 480
          }
        ]
      },
      images: {
        create: [
          {
            url: "/images/detailers/unclemikes.jpg",
            alt: "Uncle Mike's Auto Detailing Service",
            isFeatured: true
          }
        ]
      },
      businessHours: {
        create: [
          { day: 'Monday', isOpen: true, openTime: '09:00', closeTime: '17:00' },
          { day: 'Tuesday', isOpen: true, openTime: '09:00', closeTime: '17:00' },
          { day: 'Wednesday', isOpen: true, openTime: '09:00', closeTime: '17:00' },
          { day: 'Thursday', isOpen: true, openTime: '09:00', closeTime: '17:00' },
          { day: 'Friday', isOpen: true, openTime: '09:00', closeTime: '17:00' },
          { day: 'Saturday', isOpen: true, openTime: '09:00', closeTime: '15:00' },
          { day: 'Sunday', isOpen: false, openTime: '00:00', closeTime: '00:00' }
        ]
      }
    },
    {
      businessName: "DF Detailing",
      email: "df@detailing.com",
      password: hashedPassword,
      phone: "857-243-5290",
      website: "https://elitemobile.com",
      address: "21 Manville Hill Road",
      city: "Cumberland",
      state: "RI",
      zipCode: "02864",
      latitude: 41.973911,
      longitude: -71.466899,
      priceRange: "$",
      isMobile: true,
      serviceRadius: 30,
      specialties: ["Ceramic Coating", "Paint Correction"],
      googleRating: 4.9,
      totalReviews: 128,
      services: {
        create: [
          {
            name: "Premium Detail",
            description: "Full interior and exterior detail",
            price: 299.99,
            duration: 240
          },
          {
            name: "Ceramic Coating",
            description: "Professional ceramic coating application",
            price: 999.99,
            duration: 480
          }
        ]
      },
      images: {
        create: [
          {
            url: "/images/detailers/dfdetailing.jpg",
            alt: "Elite Mobile Detailing Work",
            isFeatured: true
          }
        ]
      },
      reviews: {
        create: [
          {
            rating: 5,
            comment: "Best detailing service in town!",
            authorName: "Mike Johnson",
            isVerified: true
          }
        ]
      },
      businessHours: {
        create: [
          { day: 'Monday', isOpen: true, openTime: '09:00', closeTime: '17:00' },
          { day: 'Tuesday', isOpen: true, openTime: '09:00', closeTime: '17:00' },
          { day: 'Wednesday', isOpen: true, openTime: '09:00', closeTime: '17:00' },
          { day: 'Thursday', isOpen: true, openTime: '09:00', closeTime: '17:00' },
          { day: 'Friday', isOpen: true, openTime: '09:00', closeTime: '17:00' },
          { day: 'Saturday', isOpen: true, openTime: '09:00', closeTime: '15:00' },
          { day: 'Sunday', isOpen: false, openTime: '00:00', closeTime: '00:00' }
        ]
      }
    },
    {
      businessName: "Pay Attention To Detail",
      email: "payattention@detailing.com",
      phone: "857-244-1516",
      website: "https://payattentiontodetail.com",
      address: "20 Parkman St",
      city: "Dorchester",
      state: "MA",
      zipCode: "02122",
      latitude: 42.28093,
      longitude: -71.237755,
      priceRange: "$",
      isMobile: true,
      serviceRadius: 30,
      specialties: ["Ceramic Coating", "Paint Correction"],
      googleRating: 4.9,
      totalReviews: 128,
      services: {
        create: [
          {
            name: "Premium Detail",
            description: "Full interior and exterior detail",
            price: 299.99,
            duration: 240
          },
          {
            name: "Ceramic Coating",
            description: "Professional ceramic coating application",
            price: 999.99,
            duration: 480
          }
        ]
      },
      images: {
        create: [
          {
            url: "/images/detailers/payattention.jpg",
            alt: "Pay Attention To Detail",
            isFeatured: true
          }
        ]
      },
      reviews: {
        create: [
          {
            rating: 5,
            comment: "Best detailing service in town!",
            authorName: "Mike Johnson",
            isVerified: true
          }
        ]
      },
      businessHours: {
        create: [
          { day: 'Monday', isOpen: true, openTime: '09:00', closeTime: '17:00' },
          { day: 'Tuesday', isOpen: true, openTime: '09:00', closeTime: '17:00' },
          { day: 'Wednesday', isOpen: true, openTime: '09:00', closeTime: '17:00' },
          { day: 'Thursday', isOpen: true, openTime: '09:00', closeTime: '17:00' },
          { day: 'Friday', isOpen: true, openTime: '09:00', closeTime: '17:00' },
          { day: 'Saturday', isOpen: true, openTime: '09:00', closeTime: '15:00' },
          { day: 'Sunday', isOpen: false, openTime: '00:00', closeTime: '00:00' }
        ]
      }
    },
    {
      businessName: "Jay's Mobile Auto Detail",
      email: "jay@detailing.com",
      phone: "401-678-9226",
      website: "https://elitemobile.com",
      address: "1634 Elmwood Ave",
      city: "Cranston",
      state: "RI",
      zipCode: "02910",
      latitude: 41.763360,
      longitude: -71.425069,
      priceRange: "$",
      isMobile: true,
      serviceRadius: 30,
      specialties: ["Ceramic Coating", "Paint Correction"],
      googleRating: 4.9,
      totalReviews: 128,
      services: {
        create: [
          {
            name: "Premium Detail",
            description: "Full interior and exterior detail",
            price: 299.99,
            duration: 240
          },
          {
            name: "Ceramic Coating",
            description: "Professional ceramic coating application",
            price: 999.99,
            duration: 480
          }
        ]
      },
      images: {
        create: [
          {
            url: "/images/detailers/jaymobile.jpg",
            alt: "Elite Mobile Detailing Work",
            isFeatured: true
          }
        ]
      },
      reviews: {
        create: [
          {
            rating: 5,
            comment: "Best detailing service in town!",
            authorName: "Mike Johnson",
            isVerified: true
          }
        ]
      },
      businessHours: {
        create: [
          { day: 'Monday', isOpen: true, openTime: '09:00', closeTime: '17:00' },
          { day: 'Tuesday', isOpen: true, openTime: '09:00', closeTime: '17:00' },
          { day: 'Wednesday', isOpen: true, openTime: '09:00', closeTime: '17:00' },
          { day: 'Thursday', isOpen: true, openTime: '09:00', closeTime: '17:00' },
          { day: 'Friday', isOpen: true, openTime: '09:00', closeTime: '17:00' },
          { day: 'Saturday', isOpen: true, openTime: '09:00', closeTime: '15:00' },
          { day: 'Sunday', isOpen: false, openTime: '00:00', closeTime: '00:00' }
        ]
      }
    },
    {
      businessName: "Josh's Mobile Detailing Service",
      email: "josh@detailing.com",
      phone: "860-771-3294",
      website: "https://elitemobile.com",
      address: "8 Hope St",
      city: "Attleboro",
      state: "MA",
      zipCode: "02703",
      latitude: 41.948652,
      longitude: -71.280639,
      priceRange: "$",
      isMobile: true,
      serviceRadius: 30,
      specialties: ["Ceramic Coating", "Paint Correction"],
      googleRating: 4.9,
      totalReviews: 128,
      googlePlaceId: "place_id_1",
      services: {
        create: [
          {
            name: "Premium Detail",
            description: "Full interior and exterior detail",
            price: 299.99,
            duration: 240
          },
          {
            name: "Ceramic Coating",
            description: "Professional ceramic coating application",
            price: 999.99,
            duration: 480
          }
        ]
      },
      images: {
        create: [
          {
            url: "/images/detailers/joshmobile.jpg",
            alt: "Elite Mobile Detailing Work",
            isFeatured: true
          }
        ]
      },
      reviews: {
        create: [
          {
            rating: 5,
            comment: "Best detailing service in town!",
            authorName: "Mike Johnson",
            isVerified: true
          }
        ]
      },
      businessHours: {
        create: [
          { day: 'Monday', isOpen: true, openTime: '09:00', closeTime: '17:00' },
          { day: 'Tuesday', isOpen: true, openTime: '09:00', closeTime: '17:00' },
          { day: 'Wednesday', isOpen: true, openTime: '09:00', closeTime: '17:00' },
          { day: 'Thursday', isOpen: true, openTime: '09:00', closeTime: '17:00' },
          { day: 'Friday', isOpen: true, openTime: '09:00', closeTime: '17:00' },
          { day: 'Saturday', isOpen: true, openTime: '09:00', closeTime: '15:00' },
          { day: 'Sunday', isOpen: false, openTime: '00:00', closeTime: '00:00' }
        ]
      }
    },
  ]

  // First, delete all existing data
  await prisma.businessHours.deleteMany({});
  await prisma.image.deleteMany({});
  await prisma.service.deleteMany({});
  
  for (const d of detailerData) {
    try {
      const detailer = await prisma.detailer.upsert({
        where: { email: d.email },
        update: { ...d },
        create: { ...d }
      });
      console.log(`Created/Updated detailer with id: ${detailer.id}`);
    } catch (error) {
      console.error('Error creating detailer:', error);
    }
  }

  // Verify images after creation
  const allImages = await prisma.image.findMany();
  console.log('All images in database:', allImages);

  console.log(`Seeding finished.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  }); 