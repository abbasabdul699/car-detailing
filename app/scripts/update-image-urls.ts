import { PrismaClient } from '@prisma/client'
import 'dotenv/config'

const prisma = new PrismaClient()

const S3_BASE_URL = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com`

async function updateImageUrls() {
  try {
    const detailers = await prisma.detailer.findMany({
      include: {
        images: true
      }
    })

    for (const detailer of detailers) {
      for (const image of detailer.images) {
        const oldUrl = image.url
        const fileName = oldUrl.split('/').pop()
        const newUrl = `${S3_BASE_URL}/detailers/${fileName}`

        await prisma.image.update({
          where: { id: image.id },
          data: { url: newUrl }
        })

        console.log(`Updated image URL for ${detailer.businessName}:`)
        console.log(`  Old: ${oldUrl}`)
        console.log(`  New: ${newUrl}`)
      }
    }

    console.log('Successfully updated all image URLs')
  } catch (error) {
    console.error('Error updating image URLs:', error)
  } finally {
    await prisma.$disconnect()
  }
}

updateImageUrls()
