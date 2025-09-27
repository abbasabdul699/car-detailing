import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateCustomerSnapshots() {
  console.log('🔄 Starting migration of CustomerSnapshot to Customer records...')
  
  try {
    // Get all customer snapshots that have a customer name
    const snapshots = await prisma.customerSnapshot.findMany({
      where: {
        customerName: {
          not: null
        }
      },
      include: {
        detailer: true
      }
    })

    console.log(`📊 Found ${snapshots.length} snapshots with customer names`)

    let migrated = 0
    let skipped = 0
    let errors = 0

    for (const snapshot of snapshots) {
      try {
        // Check if customer already exists
        const existingCustomer = await prisma.customer.findUnique({
          where: {
            detailerId_phone: {
              detailerId: snapshot.detailerId,
              phone: snapshot.customerPhone
            }
          }
        })

        if (existingCustomer) {
          console.log(`⏭️  Skipping ${snapshot.customerName} - customer already exists`)
          skipped++
          continue
        }

        // Prepare vehicle info
        let vehicleInfo = null
        if (snapshot.vehicleYear || snapshot.vehicleMake || snapshot.vehicleModel) {
          vehicleInfo = [{
            year: snapshot.vehicleYear,
            make: snapshot.vehicleMake,
            model: snapshot.vehicleModel,
            notes: snapshot.vehicle
          }]
        }

        // Create customer record
        const customer = await prisma.customer.create({
          data: {
            detailerId: snapshot.detailerId,
            name: snapshot.customerName!,
            phone: snapshot.customerPhone,
            address: snapshot.address,
            vehicleInfo: vehicleInfo,
            tags: [],
            createdAt: snapshot.createdAt || new Date(),
            updatedAt: snapshot.updatedAt || new Date()
          }
        })

        // Link the snapshot to the customer
        await prisma.customerSnapshot.update({
          where: { id: snapshot.id },
          data: { customerId: customer.id }
        })

        // Update any bookings for this customer
        await prisma.booking.updateMany({
          where: {
            detailerId: snapshot.detailerId,
            customerPhone: snapshot.customerPhone
          },
          data: { customerId: customer.id }
        })

        // Update any conversations for this customer
        await prisma.conversation.updateMany({
          where: {
            detailerId: snapshot.detailerId,
            customerPhone: snapshot.customerPhone
          },
          data: { customerId: customer.id }
        })

        console.log(`✅ Migrated ${snapshot.customerName} (${snapshot.customerPhone})`)
        migrated++

      } catch (error) {
        console.error(`❌ Error migrating ${snapshot.customerName}:`, error)
        errors++
      }
    }

    console.log('\n📈 Migration Summary:')
    console.log(`✅ Migrated: ${migrated}`)
    console.log(`⏭️  Skipped: ${skipped}`)
    console.log(`❌ Errors: ${errors}`)
    console.log(`📊 Total processed: ${snapshots.length}`)

  } catch (error) {
    console.error('💥 Migration failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the migration
migrateCustomerSnapshots()
  .then(() => {
    console.log('🎉 Migration completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error)
    process.exit(1)
  })
