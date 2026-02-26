import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeToE164 } from '@/lib/phone';

type UrableEventType =
  | 'appointment_created'
  | 'appointment_updated'
  | 'appointment_completed'
  | 'appointment_cancelled'
  | 'customer_created'
  | 'customer_updated';

type ZapierPayload = {
  eventType?: UrableEventType;
  detailerId?: string;
  externalAppointmentId?: string;
  externalCustomerId?: string;
  appointment?: Record<string, unknown>;
  customer?: Record<string, unknown>;
  [key: string]: unknown;
};

const URABLE_ID_MARKER = '__URABLE_APPOINTMENT_ID__:';
const DEFAULT_TIMEZONE = 'America/New_York';

function getString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .filter(Boolean);
}

function pickFirstNonEmptyArray(...values: unknown[]): string[] {
  for (const value of values) {
    const arr = getStringArray(value);
    if (arr.length > 0) return arr;
  }
  return [];
}

function extractCustomer(input: ZapierPayload): {
  name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  locationType: string | null;
  services: string[];
  vehicleModel: string | null;
  notes: string | null;
} {
  const c = (input.customer || {}) as Record<string, unknown>;
  const a = (input.appointment || {}) as Record<string, unknown>;

  const name =
    getString(c.name) ||
    getString(c.customerName) ||
    getString(a.customerName) ||
    getString(input.customerName) ||
    null;

  const rawPhone =
    getString(c.phone) ||
    getString(c.customerPhone) ||
    getString(a.customerPhone) ||
    getString(input.customerPhone) ||
    null;
  const phone = rawPhone ? normalizeToE164(rawPhone) || rawPhone : null;

  const email =
    getString(c.email) ||
    getString(c.customerEmail) ||
    getString(a.customerEmail) ||
    getString(input.customerEmail) ||
    null;

  const address =
    getString(c.address) ||
    getString(c.customerAddress) ||
    getString(a.customerAddress) ||
    getString(input.customerAddress) ||
    null;

  const locationType =
    getString(c.locationType) ||
    getString(a.locationType) ||
    getString(input.locationType) ||
    null;

  const services = pickFirstNonEmptyArray(c.services, a.services, input.services);

  const vehicleModel =
    getString(c.vehicleModel) ||
    getString(a.vehicleModel) ||
    getString(input.vehicleModel) ||
    null;

  const notes =
    getString(c.notes) ||
    getString(a.notes) ||
    getString(input.notes) ||
    null;

  return { name, phone, email, address, locationType, services, vehicleModel, notes };
}

function extractAppointment(input: ZapierPayload): {
  externalAppointmentId: string | null;
  title: string;
  startAt: Date | null;
  endAt: Date | null;
  paid: boolean;
  notes: string | null;
} {
  const a = (input.appointment || {}) as Record<string, unknown>;
  const externalAppointmentId =
    getString(input.externalAppointmentId) ||
    getString(a.id) ||
    getString(a.externalId) ||
    null;

  const title =
    getString(a.title) ||
    getString(input.title) ||
    'Urable Appointment';

  const startRaw =
    getString(a.startAt) ||
    getString(a.start) ||
    getString(a.startDateTime) ||
    getString(input.startAt) ||
    getString(input.start);

  const endRaw =
    getString(a.endAt) ||
    getString(a.end) ||
    getString(a.endDateTime) ||
    getString(input.endAt) ||
    getString(input.end);

  const startAt = startRaw ? new Date(startRaw) : null;
  const endAt = endRaw ? new Date(endRaw) : null;
  const paidRaw = a.paid ?? input.paid;
  const paid = typeof paidRaw === 'boolean' ? paidRaw : false;
  const notes = getString(a.notes) || getString(input.notes) || null;

  return {
    externalAppointmentId,
    title,
    startAt: startAt && !Number.isNaN(startAt.getTime()) ? startAt : null,
    endAt: endAt && !Number.isNaN(endAt.getTime()) ? endAt : null,
    paid,
    notes,
  };
}

function formatTimeRange(startAt: Date, endAt: Date | null, timezone: string): string {
  const fmt = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: timezone,
  });
  const startStr = fmt.format(startAt);
  if (!endAt) return startStr;
  return `${startStr} - ${fmt.format(endAt)}`;
}

function buildEventDescription(opts: {
  notes: string | null;
  externalAppointmentId: string;
  customerName: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  locationType: string | null;
  vehicleModel: string | null;
  services: string[];
}): string {
  const marker = `${URABLE_ID_MARKER}${opts.externalAppointmentId}`;
  const metadata = {
    customerName: opts.customerName,
    customerPhone: opts.customerPhone,
    customerAddress: opts.customerAddress,
    locationType: opts.locationType,
    customerType: null,
    vehicleModel: opts.vehicleModel,
    services: opts.services,
  };

  return [opts.notes, marker, `__METADATA__:${JSON.stringify(metadata)}`]
    .filter((x) => x && String(x).trim().length > 0)
    .join('\n\n');
}

async function findEventByExternalAppointmentId(detailerId: string, externalAppointmentId: string) {
  return prisma.event.findFirst({
    where: {
      detailerId,
      description: {
        contains: `${URABLE_ID_MARKER}${externalAppointmentId}`,
      },
    },
  });
}

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const secretHeader = request.headers.get('x-zapier-secret');
  const secret = process.env.URABLE_ZAPIER_SECRET;
  if (!secret) return false;
  return authHeader === `Bearer ${secret}` || secretHeader === secret;
}

export async function POST(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = (await request.json()) as ZapierPayload;
    const eventType = payload.eventType;
    if (!eventType) {
      return NextResponse.json({ error: 'eventType is required' }, { status: 400 });
    }

    const detailerId = getString(payload.detailerId);
    if (!detailerId) {
      return NextResponse.json({ error: 'detailerId is required' }, { status: 400 });
    }

    const detailer = await prisma.detailer.findUnique({
      where: { id: detailerId },
      select: { id: true, timezone: true },
    });

    if (!detailer) {
      return NextResponse.json({ error: 'Detailer not found' }, { status: 404 });
    }

    const customer = extractCustomer(payload);
    const appointment = extractAppointment(payload);
    const timezone = detailer.timezone || DEFAULT_TIMEZONE;

    let customerId: string | null = null;
    if (customer.phone) {
      const dbCustomer = await prisma.customer.upsert({
        where: {
          detailerId_phone: {
            detailerId,
            phone: customer.phone,
          },
        },
        update: {
          name: customer.name || undefined,
          email: customer.email || undefined,
          address: customer.address || undefined,
          locationType: customer.locationType || undefined,
          notes: customer.notes || undefined,
        },
        create: {
          detailerId,
          name: customer.name || 'Customer',
          phone: customer.phone,
          email: customer.email || null,
          address: customer.address || null,
          locationType: customer.locationType || null,
          notes: customer.notes || null,
          tags: [],
        },
      });
      customerId = dbCustomer.id;
    }

    if (eventType === 'customer_created' || eventType === 'customer_updated') {
      return NextResponse.json({
        success: true,
        processed: eventType,
        customerId,
      });
    }

    if (!appointment.externalAppointmentId) {
      return NextResponse.json({ error: 'externalAppointmentId is required for appointment events' }, { status: 400 });
    }
    if (!appointment.startAt) {
      return NextResponse.json({ error: 'appointment start time is required' }, { status: 400 });
    }

    const existingEvent = await findEventByExternalAppointmentId(detailerId, appointment.externalAppointmentId);

    if (eventType === 'appointment_cancelled') {
      if (existingEvent) {
        await prisma.event.delete({ where: { id: existingEvent.id } });
      }
      return NextResponse.json({
        success: true,
        processed: eventType,
        deletedEventId: existingEvent?.id || null,
      });
    }

    const eventDescription = buildEventDescription({
      notes: appointment.notes,
      externalAppointmentId: appointment.externalAppointmentId,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerAddress: customer.address,
      locationType: customer.locationType,
      vehicleModel: customer.vehicleModel,
      services: customer.services,
    });

    const eventData = {
      detailerId,
      title: appointment.title,
      description: eventDescription,
      date: appointment.startAt,
      time: formatTimeRange(appointment.startAt, appointment.endAt, timezone),
      allDay: false,
      eventType: 'appointment',
      paid: appointment.paid,
      customerId: customerId || undefined,
    } as const;

    const event = existingEvent
      ? await prisma.event.update({
          where: { id: existingEvent.id },
          data: eventData,
        })
      : await prisma.event.create({
          data: eventData,
        });

    return NextResponse.json({
      success: true,
      processed: eventType,
      eventId: event.id,
      customerId,
    });
  } catch (error) {
    console.error('Urable Zapier webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
