import { prisma } from '@/lib/prisma'

async function createDetailerRecords() {
  const users = await prisma.user.findMany({
    where: {
      role: 'DETAILER'
    }
  })

  for (const user of users) {
    const existingDetailer = await prisma.detailer.findUnique({
      where: { email: user.email }
    })

    if (!existingDetailer) {
      await prisma.detailer.create({
        data: {
          email: user.email,
          businessName: user.businessName || '',
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          phone: user.phoneNumber || '',
          description: '',
          address: '',
          city: '',
          state: '',
          zipCode: '',
          latitude: 0.0,  // Default latitude
          longitude: 0.0  // Default longitude
        }
      })
      console.log(`Created detailer record for ${user.email}`)
    }
  }
}

createDetailerRecords()
  .catch(console.error)
  .finally(() => prisma.$disconnect()) 