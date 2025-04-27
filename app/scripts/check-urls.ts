import { PrismaClient } from '@prisma/client'
import 'dotenv/config'

const prisma = new PrismaClient()

async function checkImageUrls() {
  try {
    const detailers = await prisma.detailer.findMany({
      include: {
        images: true
      }
    })

    console.log('\nCurrent Image URLs in Database:')
    console.log('==============================\n')

    for (const detailer of detailers) {
      console.log(`${detailer.businessName}:`)
      if (detailer.images.length === 0) {
        console.log('  No images found')
      } else {
        detailer.images.forEach((image, index) => {
          console.log(`  Image ${index + 1}: ${image.url}`)
        })
      }
      console.log('')
    }

  } catch (error) {
    console.error('Error checking image URLs:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkImageUrls()
