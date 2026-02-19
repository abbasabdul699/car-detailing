import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { detailerAuthOptions } from '@/app/api/auth-detailer/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

interface SurveyService {
  name: string;
  price: string;
  duration: string;
  description: string;
}

interface SurveyPreferences {
  tone: string;
  customTone?: string;
  upsellEnabled: boolean;
  mobileService: string;
  sendWindow: { start: string; end: string; includeWeekends: boolean };
}

interface SurveyOffers {
  mode: 'ai' | 'custom' | 'none';
  maxDiscount?: string;
  customOffers?: { description: string }[];
}

interface SurveyMessage {
  name: string;
  message: string;
  status: string;
}

interface SurveyPayload {
  services: SurveyService[];
  preferences: SurveyPreferences;
  offers: SurveyOffers;
  messages: SurveyMessage[];
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(detailerAuthOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const detailerId = session.user.id;
    const body: SurveyPayload = await request.json();
    const { services, preferences, offers, messages } = body;

    // Upsert services and link them to the detailer
    if (services && services.length > 0) {
      const validServices = services.filter((s) => s.name.trim());

      for (const svc of validServices) {
        const priceNum = parseFloat(svc.price) || undefined;
        const durationNum = parseInt(svc.duration, 10) || undefined;

        const service = await prisma.service.upsert({
          where: { name: svc.name.trim() },
          create: {
            name: svc.name.trim(),
            description: svc.description || undefined,
            basePrice: priceNum,
            duration: durationNum,
          },
          update: {
            description: svc.description || undefined,
            basePrice: priceNum,
            duration: durationNum,
          },
        });

        const existingLink = await prisma.detailerService.findFirst({
          where: { detailerId, serviceId: service.id },
        });

        if (!existingLink) {
          await prisma.detailerService.create({
            data: { detailerId, serviceId: service.id },
          });
        }
      }
    }

    // Save preferences, offers, and reviewed messages as carbonAiPreferences
    const carbonAiPreferences = {
      ...(preferences || {}),
      offers: offers || {},
      reviewedMessages: messages
        ? messages.map((m) => ({
            name: m.name,
            message: m.message,
            status: m.status,
          }))
        : [],
    };

    await prisma.detailer.update({
      where: { id: detailerId },
      data: { carbonAiPreferences },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving onboarding survey:', error);
    return NextResponse.json(
      { error: 'Failed to save survey data' },
      { status: 500 }
    );
  }
}
