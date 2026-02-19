import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { detailerAuthOptions } from '@/app/api/auth-detailer/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { normalizeToE164 } from '@/lib/phone';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Types ────────────────────────────────────────────────────────────────────

interface CarbonAiPreferences {
  tone?: string;
  customTone?: string;
  upsellEnabled?: boolean;
  mobileService?: string;
  sendWindow?: { start: string; end: string; includeWeekends: boolean };
  offers?: { mode?: string; maxDiscount?: string; customOffers?: { description: string }[] };
  reviewedMessages?: { name: string; message: string; status: string }[];
}

interface WeatherDay {
  date: string;
  condition: string;
  maxTempF: number;
  minTempF: number;
  chanceOfRain: number;
  chanceOfSnow: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function getReengageStatus(daysSinceVisit: number | null): string {
  if (daysSinceVisit == null) return 'New';
  if (daysSinceVisit > 45) return 'Overdue';
  if (daysSinceVisit > 25) return 'Due Soon';
  return 'Active';
}

function generateScheduleTimes(count: number): string[] {
  const windows = [
    { startH: 10, startM: 30, endH: 12, endM: 0 },
    { startH: 17, startM: 30, endH: 19, endM: 0 },
  ];

  const allSlots: string[] = [];
  for (const w of windows) {
    const startMin = w.startH * 60 + w.startM;
    const endMin = w.endH * 60 + w.endM;
    for (let m = startMin; m < endMin; m += 15) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      allSlots.push(`${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
    }
  }

  if (count <= 0 || allSlots.length === 0) return ['10:30'];
  const times: string[] = [];
  for (let i = 0; i < count; i++) {
    times.push(allSlots[i % allSlots.length]);
  }
  return times;
}

function isDayOpen(businessHours: Record<string, unknown>, dayName: string): boolean {
  const val = businessHours[dayName];
  if (val == null) return false;
  if (Array.isArray(val) && val.length >= 2) return true;
  if (typeof val === 'object' && val !== null && 'open' in val) return true;
  return false;
}

async function fetchWeatherForecast(zipCode: string): Promise<WeatherDay[]> {
  const apiKey = process.env.WEATHER_API_KEY;
  if (!apiKey) return [];

  try {
    const res = await fetch(
      `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${encodeURIComponent(zipCode)}&days=14&aqi=no&alerts=no`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const days: WeatherDay[] = (data.forecast?.forecastday || []).map((d: Record<string, unknown>) => {
      const day = d.day as Record<string, unknown>;
      return {
        date: d.date as string,
        condition: (day.condition as Record<string, unknown>)?.text as string || 'Unknown',
        maxTempF: day.maxtemp_f as number,
        minTempF: day.mintemp_f as number,
        chanceOfRain: day.daily_chance_of_rain as number || 0,
        chanceOfSnow: day.daily_chance_of_snow as number || 0,
      };
    });
    return days;
  } catch {
    return [];
  }
}

function buildWeatherSummary(forecast: WeatherDay[]): string {
  if (forecast.length === 0) return '';
  return forecast.map(d => {
    const parts = [`${d.date}: ${d.condition} ${Math.round(d.maxTempF)}F/${Math.round(d.minTempF)}F`];
    if (d.chanceOfSnow > 30) parts.push(`${d.chanceOfSnow}% snow`);
    else if (d.chanceOfRain > 30) parts.push(`${d.chanceOfRain}% rain`);
    return parts.join(', ');
  }).join(' | ');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  console.log('[generate-followups] POST called');
  try {
    const session = await getServerSession(detailerAuthOptions);
    if (!session || !session.user?.id) {
      console.log('[generate-followups] Unauthorized - no session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const detailerId = session.user.id;
    console.log('[generate-followups] detailerId:', detailerId);
    const now = new Date();

    // ── 1. Clear existing scheduled followups and fetch all data ─────────────

    let body: { regenerate?: boolean } = {};
    try { body = await request.json(); } catch { /* no body is fine */ }

    if (body.regenerate) {
      await prisma.followup.deleteMany({ where: { detailerId, status: 'scheduled' } });
      console.log('[generate-followups] Cleared existing scheduled followups');
    }

    const [detailer, customers, events, bookings, existingFollowups] = await Promise.all([
      prisma.detailer.findUnique({
        where: { id: detailerId },
        select: {
          businessName: true,
          timezone: true,
          zipCode: true,
          businessHours: true,
          carbonAiPreferences: true,
          services: { include: { service: { select: { name: true, basePrice: true, duration: true } } } },
        }
      }),
      prisma.customerSnapshot.findMany({
        where: { detailerId },
        include: { customer: { select: { id: true } } }
      }),
      prisma.event.findMany({
        where: { detailerId },
        select: { id: true, date: true, time: true, description: true, bookingId: true }
      }),
      prisma.booking.findMany({
        where: { detailerId },
        select: { id: true, scheduledDate: true, scheduledTime: true, status: true, customerPhone: true }
      }),
      prisma.followup.findMany({
        where: { detailerId, status: 'scheduled' },
        select: { customerPhone: true }
      }),
    ]);

    console.log('[generate-followups] Data fetched:', {
      detailer: !!detailer,
      customers: customers.length,
      events: events.length,
      bookings: bookings.length,
      existingFollowups: existingFollowups.length,
    });

    if (!detailer) {
      return NextResponse.json({ error: 'Detailer not found' }, { status: 404 });
    }

    // ── 2. Parse detailer preferences ─────────────────────────────────────────

    const prefs: CarbonAiPreferences = (detailer.carbonAiPreferences &&
      typeof detailer.carbonAiPreferences === 'object')
      ? detailer.carbonAiPreferences as CarbonAiPreferences
      : {};

    const businessHours: Record<string, unknown> = (detailer.businessHours &&
      typeof detailer.businessHours === 'object')
      ? detailer.businessHours as Record<string, unknown>
      : {};

    const sendWindowStart = prefs.sendWindow?.start || '09:00';
    const sendWindowEnd = prefs.sendWindow?.end || '17:00';
    const includeWeekends = prefs.sendWindow?.includeWeekends ?? true;

    const detailerServices = detailer.services
      ?.map(ds => ds.service?.name).filter(Boolean) || [];

    console.log('[generate-followups] Preferences:', {
      tone: prefs.tone,
      upsell: prefs.upsellEnabled,
      mobile: prefs.mobileService,
      sendWindow: `${sendWindowStart}-${sendWindowEnd}`,
      weekends: includeWeekends,
      servicesOffered: detailerServices.length,
    });

    // ── 3. Fetch weather forecast (non-blocking) ──────────────────────────────

    const weatherForecast = await fetchWeatherForecast(detailer.zipCode);
    const weatherSummary = buildWeatherSummary(weatherForecast);
    console.log('[generate-followups] Weather:', weatherForecast.length, 'days fetched');

    // ── 4. Compute completed service stats ────────────────────────────────────

    const completedServiceStats = new Map<string, { count: number; lastAt: Date }>();
    const updateStats = (phoneRaw: string | null | undefined, completedAt: Date) => {
      if (!phoneRaw) return;
      if (Number.isNaN(completedAt.getTime())) return;
      if (completedAt.getTime() >= now.getTime()) return;
      const normalizedPhone = normalizeToE164(phoneRaw) || phoneRaw;
      const existing = completedServiceStats.get(normalizedPhone);
      if (!existing) {
        completedServiceStats.set(normalizedPhone, { count: 1, lastAt: completedAt });
        return;
      }
      existing.count += 1;
      if (completedAt.getTime() > existing.lastAt.getTime()) {
        existing.lastAt = completedAt;
      }
    };

    for (const booking of bookings) {
      if (booking.status !== 'completed') continue;
      updateStats(booking.customerPhone, booking.scheduledDate);
    }

    for (const event of events) {
      if (event.bookingId) continue;
      if (!event.description || !event.description.includes('__METADATA__:')) continue;
      try {
        const metadata = JSON.parse(event.description.split('__METADATA__:')[1] || '{}');
        if (metadata.customerPhone) {
          updateStats(metadata.customerPhone, event.date);
        }
      } catch { continue; }
    }

    // ── 5. Build calendar load map (events per day for capacity check) ────────

    const calendarLoad = new Map<string, number>();
    for (const booking of bookings) {
      if (booking.status === 'cancelled') continue;
      const dateStr = booking.scheduledDate.toISOString().split('T')[0];
      calendarLoad.set(dateStr, (calendarLoad.get(dateStr) || 0) + 1);
    }
    for (const event of events) {
      const dateStr = event.date.toISOString().split('T')[0];
      calendarLoad.set(dateStr, (calendarLoad.get(dateStr) || 0) + 1);
    }

    // ── 6. Build eligible customers with enriched data ────────────────────────

    const existingPhones = new Set(
      existingFollowups
        .filter(f => f.customerPhone)
        .map(f => normalizeToE164(f.customerPhone!) || f.customerPhone!)
    );

    const eligibleCustomers = customers
      .map((c) => {
        const normalizedPhone = normalizeToE164(c.customerPhone) || c.customerPhone;
        const stats = completedServiceStats.get(normalizedPhone);
        const customerData = (c.data && typeof c.data === 'object') ? c.data as Record<string, unknown> : {};
        const importedVisitCount = typeof customerData.importedVisitCount === 'number' ? customerData.importedVisitCount : 0;
        const importedLastVisit = typeof customerData.importedLastVisit === 'string' ? customerData.importedLastVisit : null;

        const realCount = stats?.count ?? 0;
        const completedServiceCount = realCount + importedVisitCount;

        let lastCompletedServiceAt: string | null = stats?.lastAt ? stats.lastAt.toISOString() : null;
        if (importedLastVisit) {
          const importedDate = new Date(importedLastVisit);
          if (!isNaN(importedDate.getTime())) {
            if (!lastCompletedServiceAt || importedDate.getTime() > new Date(lastCompletedServiceAt).getTime()) {
              lastCompletedServiceAt = importedDate.toISOString();
            }
          }
        }

        let daysSinceVisit: number | null = null;
        if (lastCompletedServiceAt) {
          daysSinceVisit = Math.floor((now.getTime() - new Date(lastCompletedServiceAt).getTime()) / (1000 * 60 * 60 * 24));
        }

        const vehicles: string[] = [];
        if (customerData.vehicles && Array.isArray(customerData.vehicles)) {
          vehicles.push(...(customerData.vehicles as string[]).filter((v: string) => typeof v === 'string' && v.trim()));
        } else if (c.vehicleModel) {
          vehicles.push(c.vehicleModel);
        }

        const lifetimeValue = typeof customerData.importedLifetimeValue === 'number'
          ? customerData.importedLifetimeValue : null;
        const pets = typeof customerData.pets === 'string' && customerData.pets.trim()
          ? customerData.pets as string : null;
        const kids = typeof customerData.kids === 'string' && customerData.kids.trim()
          ? customerData.kids as string : null;
        const notes = typeof customerData.notes === 'string' && customerData.notes.trim()
          ? customerData.notes as string : null;

        return {
          id: c.id,
          customerId: c.customer?.id || null,
          customerName: c.customerName || 'Unknown',
          customerPhone: c.customerPhone,
          customerEmail: c.customerEmail || null,
          vehicles,
          vehicleInfo: vehicles.join(' + '),
          services: c.services || [],
          lastService: c.services?.[0] || null,
          locationType: c.locationType || null,
          daysSinceVisit,
          completedServiceCount,
          normalizedPhone,
          lifetimeValue,
          pets,
          kids,
          notes,
          reengageStatus: getReengageStatus(daysSinceVisit),
        };
      })
      .filter((c) => c.completedServiceCount >= 1)
      .filter((c) => !existingPhones.has(c.normalizedPhone))
      .slice(0, 25);

    // ── 7. Sort by priority tier, then by LTV within tier ─────────────────────

    const tierOrder: Record<string, number> = { 'Overdue': 0, 'Due Soon': 1, 'Active': 2, 'New': 3 };

    eligibleCustomers.sort((a, b) => {
      const tierDiff = (tierOrder[a.reengageStatus] ?? 3) - (tierOrder[b.reengageStatus] ?? 3);
      if (tierDiff !== 0) return tierDiff;
      return (b.lifetimeValue ?? 0) - (a.lifetimeValue ?? 0);
    });

    console.log('[generate-followups] Eligible customers:', eligibleCustomers.length,
      'of', customers.length, 'total. Tiers:',
      Object.fromEntries(['Overdue', 'Due Soon', 'Active', 'New'].map(t =>
        [t, eligibleCustomers.filter(c => c.reengageStatus === t).length]
      )));

    if (eligibleCustomers.length === 0) {
      console.log('[generate-followups] No eligible customers found');
      return NextResponse.json({ followups: [], count: 0, message: 'No eligible customers found' });
    }

    // ── 8. Build schedule slots (business-hours-aware, capacity-capped) ───────

    const MAX_OUTREACH_PER_DAY = 25;
    const scheduleTimes = generateScheduleTimes(MAX_OUTREACH_PER_DAY);
    const outreachPerDay = new Map<string, number>();

    function getNextAvailableDate(startDate: Date): { date: Date; time: string } {
      const candidate = new Date(startDate);
      for (let attempt = 0; attempt < 60; attempt++) {
        const dayName = DAY_NAMES[candidate.getDay()];
        const isWeekend = candidate.getDay() === 0 || candidate.getDay() === 6;

        if (isWeekend && !includeWeekends) {
          candidate.setDate(candidate.getDate() + 1);
          continue;
        }

        const hasBusinessHours = Object.keys(businessHours).length > 0;
        if (hasBusinessHours && !isDayOpen(businessHours, dayName)) {
          candidate.setDate(candidate.getDate() + 1);
          continue;
        }

        const dateStr = candidate.toISOString().split('T')[0];
        const existingLoad = calendarLoad.get(dateStr) || 0;
        const outreachCount = outreachPerDay.get(dateStr) || 0;

        if (outreachCount >= MAX_OUTREACH_PER_DAY) {
          candidate.setDate(candidate.getDate() + 1);
          continue;
        }

        if (existingLoad >= 6 && outreachCount >= 1) {
          candidate.setDate(candidate.getDate() + 1);
          continue;
        }

        outreachPerDay.set(dateStr, outreachCount + 1);
        const timeIdx = outreachCount % scheduleTimes.length;
        return { date: new Date(candidate), time: scheduleTimes[timeIdx] };
      }

      return { date: new Date(candidate), time: scheduleTimes[0] };
    }

    // ── 9. Assign schedule dates based on priority tiers ──────────────────────

    const today = new Date();
    const scheduleAssignments: { customer: typeof eligibleCustomers[0]; date: Date; time: string }[] = [];

    for (let i = 0; i < eligibleCustomers.length; i++) {
      const customer = eligibleCustomers[i];

      let baseDayOffset: number;
      if (customer.reengageStatus === 'Overdue') {
        const tierCount = eligibleCustomers.filter(c => c.reengageStatus === 'Overdue').length;
        const tierIdx = eligibleCustomers.filter((c, j) => j < i && c.reengageStatus === 'Overdue').length;
        baseDayOffset = tierCount <= 1 ? 1 : Math.round((tierIdx / (tierCount - 1)) * 10) + 1;
      } else if (customer.reengageStatus === 'Due Soon') {
        const tierCount = eligibleCustomers.filter(c => c.reengageStatus === 'Due Soon').length;
        const tierIdx = eligibleCustomers.filter((c, j) => j < i && c.reengageStatus === 'Due Soon').length;
        baseDayOffset = tierCount <= 1 ? 11 : Math.round((tierIdx / (tierCount - 1)) * 7) + 11;
      } else {
        const tierCount = eligibleCustomers.filter(c => c.reengageStatus === 'Active' || c.reengageStatus === 'New').length;
        const tierIdx = eligibleCustomers.filter((c, j) => j < i && (c.reengageStatus === 'Active' || c.reengageStatus === 'New')).length;
        baseDayOffset = tierCount <= 1 ? 19 : Math.round((tierIdx / (tierCount - 1)) * 9) + 19;
      }

      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + baseDayOffset);

      const slot = getNextAvailableDate(targetDate);
      scheduleAssignments.push({ customer, date: slot.date, time: slot.time });
    }

    // ── 10. Build enriched customer summaries for AI ──────────────────────────

    const customerSummaries = scheduleAssignments.map((a, i) => {
      const c = a.customer;
      const summary: Record<string, unknown> = {
        index: i,
        name: c.customerName,
        vehicles: c.vehicles,
        allServices: c.services,
        lastService: c.lastService,
        timeSinceVisit: c.daysSinceVisit != null
          ? c.daysSinceVisit < 30
            ? `${c.daysSinceVisit} days`
            : c.daysSinceVisit < 60
              ? 'about a month'
              : `about ${Math.round(c.daysSinceVisit / 30)} months`
          : 'unknown',
        totalVisits: c.completedServiceCount,
        locationType: c.locationType,
        reengageStatus: c.reengageStatus,
        hasEmail: !!c.customerEmail,
      };
      if (c.lifetimeValue != null) summary.lifetimeValue = `$${c.lifetimeValue}`;
      if (c.pets) summary.pets = c.pets;
      if (c.kids) summary.kids = c.kids;
      if (c.notes) summary.notes = c.notes;
      return summary;
    });

    // ── 11. Build enhanced AI system prompt ───────────────────────────────────

    const toneLine = prefs.tone === 'professional'
      ? 'Use a polished, professional tone.'
      : prefs.customTone
        ? `Use this specific tone: "${prefs.customTone}"`
        : 'Use a casual, friendly tone -- like texting a customer you know.';

    let offersLine = '';
    if (prefs.offers?.mode === 'custom' && prefs.offers.customOffers?.length) {
      offersLine = `\nActive promotions you can reference (use sparingly, not every message):\n${prefs.offers.customOffers.map(o => `- ${o.description}`).join('\n')}`;
    } else if (prefs.offers?.mode === 'ai' && prefs.offers.maxDiscount) {
      offersLine = `\nYou may create promotional offers up to ${prefs.offers.maxDiscount} off. Use sparingly for win-back customers.`;
    }

    let upsellLine = '';
    if (prefs.upsellEnabled && detailerServices.length > 0) {
      upsellLine = `\nServices offered for upsell opportunities: ${detailerServices.join(', ')}`;
    }

    let mobileLine = '';
    if (prefs.mobileService === 'yes') {
      mobileLine = '\nThis is a MOBILE detailing service -- emphasize convenience ("we come to you") when relevant.';
    }

    let weatherLine = '';
    if (weatherSummary) {
      weatherLine = `\n\n14-day weather forecast for the service area (optional context):\n${weatherSummary}\n\nIMPORTANT: Weather is just ONE possible hook among many. Only use a weather hook for 2-3 customers MAX where it's genuinely compelling (e.g. snow/salt damage, heavy rain cleanup). Most messages should use OTHER hooks: maintenance timing, loyalty/VIP, upsell, convenience, seasonal, "been a while", multi-vehicle deals, etc. Do NOT add "Weather" to outreachTags unless the message actually references the weather.`;
    }

    let examplesLine = '';
    const approvedMessages = (prefs.reviewedMessages || []).filter(m => m.status === 'approved');
    if (approvedMessages.length > 0) {
      examplesLine = `\n\nHere are example messages the business owner approved -- match this style:\n${approvedMessages.map(m => `- "${m.message}"`).join('\n')}`;
    }

    const systemPrompt = `You write text messages for "${detailer.businessName}", a car detailing business. You're texting customers as if you're the actual detailer who just thought of them.

${toneLine}${mobileLine}${upsellLine}${offersLine}${examplesLine}${weatherLine}

For each customer, return:
- "draftMessage": A super short, casual text message (1-2 sentences MAX). This should read like a real human sent it, not a business.
- "aiReasoning": 2-3 sentences explaining WHY this customer was selected and the outreach strategy. Include data-driven insights.
- "reasonLine": A one-line summary (e.g., "Regular customer, 8 months overdue")
- "outreachTags": Array of 2-4 tags from: "Re-engage", "Mobile", "Spring", "Kids", "Dogs", "Upsell", "VIP", "EV Specialist", "Win-back", "Ceramic Maintenance", "Multi-vehicle", "Fleet", "Seasonal", "Loyalty", "Weather"
- "confidenceScore": 0-100 likelihood of positive response
- "priority": "high", "medium", or "low"

VOICE & TONE — this is the most important part:
- Write like you JUST thought of this person. Like "oh hey I was thinking about you" energy. Not "Dear valued customer."
- Examples of the vibe:
  - "Hey! Just drove past your neighborhood Sarah and remembered your Accord is probably due. Want me to swing by this week?"
  - "Hi! Spring's around the corner Lucas, bet that F-150 could use a good wash after all this winter grime. Lmk if you want to get on the schedule"
  - "Hey! How's the Model 3 treating you Olivia? Been a minute — want me to get you on the books?"
  - "Hi! Noah I know with the kids back in school the BMW's probably seen better days, want me to come by?"
  - "Hey! Pollen season is about to hit Sophia — want to get ahead of it with a detail on the Mazda?"
- Keep it SHORT. Like a text you'd actually send, not a paragraph.
- Use their first name naturally (start of message or mid-sentence, vary it)
- Mention their car casually, don't force it
- No emojis
- NEVER use exclamation marks on every sentence. Mix periods, questions, and the occasional !
- Use lowercase energy. "lmk", "want me to", "bet that" — conversational shortcuts are fine but make sure the first letter is uppercase always.
- ALWAYS open with "Hey!" or "Hi!" — then weave the customer's name in naturally after (not immediately after the greeting). Vary between "Hey!" and "Hi!" across messages.

HOOKS — use personal insights when available, they're gold:
- Pets: "I know [pet name/type] probably has the backseat looking rough" 
- Kids: reference the chaos kids bring to cars naturally
- Seasons: pollen, salt, rain, summer road trips — tie it to their actual car
- Time since last visit: "been a minute", "feels like it's been a while", "a couple months" — NEVER say exact day counts. If you reference time, use vague/approximate terms like "a couple months", "a few months", "a while". No one texts "it's been 150 days"
- Multi-vehicle households: "want to knock out both cars while I'm there?"

Rules:
- First name only, always
- Reference their vehicle make/model but weave it in naturally
- Keep messages under 140 characters when possible — shorter is better
- CRITICAL: Every customer gets a UNIQUE message. No two should feel like the same template.
- Overdue (>45 days): "been a while" / "just remembered" / casual check-in energy
- Due Soon (25-45 days): "coming up on time" / proactive but chill
- Active (<25 days): light touch, "your next one's coming up"
- If customer has high lifetime value (>$1000), treat them like a friend/VIP — warmer tone
- If customer has detailer notes, USE them — that's the most personal hook you have

Return a JSON object with key "customers" containing an array in the same order as input.`;

    // ── 12. Call OpenAI ───────────────────────────────────────────────────────

    console.log('[generate-followups] Calling OpenAI with', customerSummaries.length, 'customers');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.85,
      max_tokens: 4000,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify(customerSummaries) }
      ],
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: 'AI generation failed' }, { status: 500 });
    }

    let aiResults: { customers: Array<{
      draftMessage: string;
      aiReasoning: string;
      reasonLine: string;
      outreachTags: string[];
      confidenceScore: number;
      priority: string;
    }> };

    try {
      aiResults = JSON.parse(content);
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

    // ── 13. Create followup records ───────────────────────────────────────────

    const aiCustomers = aiResults.customers || [];
    const created = [];

    for (let i = 0; i < scheduleAssignments.length; i++) {
      const { customer, date: scheduledDate, time: scheduledTime } = scheduleAssignments[i];
      const ai = aiCustomers[i];
      if (!ai) continue;

      const tags = [
        ...(ai.outreachTags || []),
        ...(customer.lastService ? [customer.lastService] : []),
        ...(customer.locationType ? [customer.locationType] : []),
      ];

      try {
        const followup = await prisma.followup.create({
          data: {
            detailerId,
            customerId: customer.customerId || null,
            customerName: customer.customerName,
            customerPhone: customer.customerPhone,
            customerEmail: customer.customerEmail,
            vehicleInfo: customer.vehicleInfo || null,
            vehicles: customer.vehicles,
            lastService: customer.lastService,
            daysSinceVisit: customer.daysSinceVisit,
            scheduledDate,
            scheduledTime,
            draftMessage: ai.draftMessage || null,
            priority: ai.priority || 'medium',
            status: 'scheduled',
            channel: 'sms',
            reasonLine: ai.reasonLine || null,
            confidenceScore: ai.confidenceScore ?? null,
            tags,
            locationType: customer.locationType,
            aiReasoning: ai.aiReasoning || null,
          },
        });
        created.push(followup);
      } catch (err) {
        console.error(`Failed to create followup for ${customer.customerName}:`, err);
      }
    }

    console.log('[generate-followups] Created', created.length, 'followups');
    return NextResponse.json({ followups: created, count: created.length }, { status: 201 });
  } catch (error) {
    console.error('[generate-followups] Error:', error);
    return NextResponse.json({ error: 'Failed to generate followups' }, { status: 500 });
  }
}
