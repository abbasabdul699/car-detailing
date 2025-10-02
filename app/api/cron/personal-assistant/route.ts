import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    console.log('🤖 Personal Assistant Cron Job Started');

    // Get all detailers with personal phone numbers
    const detailers = await prisma.detailer.findMany({
      where: {
        personalPhoneNumber: { not: null },
        smsEnabled: true
      },
      select: {
        id: true,
        businessName: true,
        personalPhoneNumber: true,
        twilioPhoneNumber: true
      }
    });

    console.log(`Found ${detailers.length} detailers with personal assistant enabled`);

    for (const detailer of detailers) {
      try {
        // Send appointment reminders (appointments in next 2 hours)
        await sendAppointmentReminders(detailer);
        
        // Send daily summary at 6 PM
        await sendDailySummary(detailer);
        
        // Send weekly summary on Sundays at 7 PM
        await sendWeeklySummary(detailer);
        
      } catch (error) {
        console.error(`Error processing detailer ${detailer.id}:`, error);
      }
    }

    return NextResponse.json({ success: true, processed: detailers.length });

  } catch (error) {
    console.error('❌ Personal Assistant cron error:', error);
    return NextResponse.json(
      { error: 'Cron job failed' },
      { status: 500 }
    );
  }
}

async function sendAppointmentReminders(detailer: any) {
  const now = new Date();
  const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  
  // Find appointments in the next 2 hours
  const upcomingAppointments = await prisma.booking.findMany({
    where: {
      detailerId: detailer.id,
      scheduledDate: {
        gte: now,
        lte: twoHoursFromNow
      },
      status: { in: ['confirmed', 'pending'] }
    },
    select: {
      id: true,
      customerName: true,
      customerPhone: true,
      services: true,
      scheduledDate: true,
      scheduledTime: true,
      vehicleType: true,
      vehicleLocation: true
    }
  });

  for (const appointment of upcomingAppointments) {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://www.reevacar.com'}/api/notifications/personal-assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          detailerId: detailer.id,
          type: 'appointment_reminder',
          data: {
            customerName: appointment.customerName,
            customerPhone: appointment.customerPhone,
            services: appointment.services,
            scheduledDate: appointment.scheduledDate,
            scheduledTime: appointment.scheduledTime,
            vehicleType: appointment.vehicleType,
            vehicleLocation: appointment.vehicleLocation
          }
        })
      });
      
      console.log(`📅 Reminder sent for appointment ${appointment.id}`);
    } catch (error) {
      console.error(`Error sending reminder for appointment ${appointment.id}:`, error);
    }
  }
}

async function sendDailySummary(detailer: any) {
  const now = new Date();
  const hour = now.getHours();
  
  // Only send at 6 PM (18:00)
  if (hour !== 18) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Get today's stats
  const [newBookings, completedBookings, messages] = await Promise.all([
    prisma.booking.count({
      where: {
        detailerId: detailer.id,
        createdAt: { gte: today, lt: tomorrow },
        status: 'confirmed'
      }
    }),
    prisma.booking.count({
      where: {
        detailerId: detailer.id,
        scheduledDate: { gte: today, lt: tomorrow },
        status: 'completed'
      }
    }),
    prisma.message.count({
      where: {
        conversation: { detailerId: detailer.id },
        createdAt: { gte: today, lt: tomorrow }
      }
    })
  ]);

  // Calculate revenue (simplified - you might want to add pricing logic)
  const revenue = (newBookings + completedBookings) * 150; // Assuming $150 average per booking

  try {
    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://www.reevacar.com'}/api/notifications/personal-assistant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        detailerId: detailer.id,
        type: 'daily_summary',
        data: {
          newBookings,
          completed: completedBookings,
          revenue,
          messages
        }
      })
    });
    
    console.log(`📊 Daily summary sent for detailer ${detailer.id}`);
  } catch (error) {
    console.error(`Error sending daily summary for detailer ${detailer.id}:`, error);
  }
}

async function sendWeeklySummary(detailer: any) {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday
  const hour = now.getHours();
  
  // Only send on Sundays at 7 PM (19:00)
  if (dayOfWeek !== 0 || hour !== 19) return;

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  // Get this week's stats
  const [totalBookings, newCustomers, messages] = await Promise.all([
    prisma.booking.count({
      where: {
        detailerId: detailer.id,
        createdAt: { gte: weekAgo }
      }
    }),
    prisma.customer.count({
      where: {
        detailerId: detailer.id,
        createdAt: { gte: weekAgo }
      }
    }),
    prisma.message.count({
      where: {
        conversation: { detailerId: detailer.id },
        createdAt: { gte: weekAgo }
      }
    })
  ]);

  const revenue = totalBookings * 150; // Assuming $150 average per booking

  try {
    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://www.reevacar.com'}/api/notifications/personal-assistant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        detailerId: detailer.id,
        type: 'weekly_summary',
        data: {
          totalBookings,
          newCustomers,
          revenue,
          messages
        }
      })
    });
    
    console.log(`📈 Weekly summary sent for detailer ${detailer.id}`);
  } catch (error) {
    console.error(`Error sending weekly summary for detailer ${detailer.id}:`, error);
  }
}
