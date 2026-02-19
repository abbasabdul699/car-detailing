import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { detailerAuthOptions } from '@/app/api/auth-detailer/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

interface CustomerData {
  vehicles?: Array<{ year?: number; make?: string; model?: string; raw?: string }>;
  importedFirstVisit?: string;
  importedLastVisit?: string;
  importedVisitCount?: number;
  importedLifetimeValue?: number;
  notes?: string;
  technician?: string;
  pets?: string;
  kids?: string;
  stateValid?: boolean;
}

interface CustomerRecord {
  customerPhone: string;
  customerName: string | null;
  locationType: string | null;
  customerType: string | null;
  vehicle: string | null;
  services: string[];
  data: CustomerData | null;
}

const FLAG_KEYWORDS = [
  'avoid', 'do not contact', 'dnc', 'no-show', 'noshow', 'no show',
  'cancel', 'complaint', 'rude', 'difficult', 'banned', 'block',
  'refund', 'dispute', 'problem', 'issue', 'angry', 'hostile',
  'threatening', 'scam', 'fraud', 'chargeback',
];

function parseDate(dateStr: string | undefined | null): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function getMonthName(monthIndex: number): string {
  return ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'][monthIndex];
}

function isReturningCustomer(data: CustomerData | null, visitCount: number): boolean {
  if (visitCount >= 2) return true;
  if (data?.importedVisitCount && data.importedVisitCount >= 2) return true;
  return false;
}

function getAtRiskScore(data: CustomerData | null, now: Date): "churned" | "at_risk" | "active" {
  const lastVisit = parseDate(data?.importedLastVisit);
  const firstVisit = parseDate(data?.importedFirstVisit);
  const visits = data?.importedVisitCount || 1;
  const refDate = lastVisit || firstVisit;

  if (!refDate) return "at_risk";

  const daysSince = Math.floor((now.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24));

  // Hard churn: no visit in 12+ months
  if (daysSince > 365) return "churned";

  // Calculate expected visit gap from their history
  if (firstVisit && lastVisit && visits >= 2) {
    const historyDays = Math.max(1, Math.floor((lastVisit.getTime() - firstVisit.getTime()) / (1000 * 60 * 60 * 24)));
    const avgGap = historyDays / (visits - 1);
    // At risk if overdue by 1.5x their average gap
    if (daysSince > avgGap * 1.5) return "at_risk";
    // Also at risk if it's been more than 6 months regardless
    if (daysSince > 180) return "at_risk";
    return "active";
  }

  // Single visit or no frequency data: at risk after 3 months, churned after 12
  if (daysSince > 90) return "at_risk";
  return "active";
}

function isServiceType(services: string[], keywords: string[]): boolean {
  return services.some(s => {
    const lower = s.toLowerCase();
    return keywords.some(k => lower.includes(k));
  });
}

function isMobileLocation(locationType: string | null): boolean {
  if (!locationType) return false;
  const lower = locationType.toLowerCase();
  return ['mobile', 'van', 'home', 'driveway', 'on-site', 'onsite'].some(k => lower.includes(k));
}

function isShopLocation(locationType: string | null): boolean {
  if (!locationType) return false;
  const lower = locationType.toLowerCase();
  return ['shop', 'drop-off', 'dropoff', 'drop off', 'store', 'garage', 'bay', 'in-shop'].some(k => lower.includes(k));
}

function isFlagged(notes: string | undefined | null): boolean {
  if (!notes) return false;
  const lower = notes.toLowerCase();
  return FLAG_KEYWORDS.some(k => lower.includes(k));
}

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(detailerAuthOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const detailerId = session.user.id;

    const customers = await prisma.customerSnapshot.findMany({
      where: { detailerId },
      select: {
        customerPhone: true,
        customerName: true,
        locationType: true,
        customerType: true,
        vehicle: true,
        services: true,
        data: true,
      },
    }) as CustomerRecord[];

    const totalCustomers = customers.length;

    if (totalCustomers === 0) {
      return NextResponse.json({
        totalCustomers: 0,
        churnRate: 0,
        lostCustomers: 0,
        atRiskCount: 0,
        atRiskRate: 0,
        churnedCount: 0,
        estimatedRevenueLost: 0,
        multiVehicleCount: 0,
        multiVehicleReturnRate: 0,
        singleVehicleReturnRate: 0,
        hasMultiVehicleData: false,
        expressUpgradeRate: 0,
        hasServiceData: false,
        mobileReturnRate: 0,
        shopReturnRate: 0,
        hasLocationData: false,
        mobileCount: 0,
        shopCount: 0,
        peakMonth: null,
        slowMonth: null,
        peakToSlowRatio: 0,
        hasSeasonalData: false,
        flaggedCount: 0,
        hasNotesData: false,
        avgLifetimeValue: 0,
        avgVisitsPerCustomer: 0,
      });
    }

    const now = new Date();

    // --- Churn analysis ---
    let churnedCount = 0;
    let atRiskCount = 0;
    let hasDateData = false;

    // --- Multi-vehicle analysis ---
    let multiVehicleCustomers: CustomerRecord[] = [];
    let singleVehicleCustomers: CustomerRecord[] = [];

    // --- Service analysis ---
    let expressCustomers = 0;
    let expressToUpgradeCount = 0;
    let hasServiceData = false;

    // --- Location analysis ---
    let mobileCustomers: CustomerRecord[] = [];
    let shopCustomers: CustomerRecord[] = [];
    let hasLocationData = false;

    // --- Seasonal analysis ---
    const monthCounts = new Array(12).fill(0);
    let hasSeasonalData = false;

    // --- Flagged customers ---
    let flaggedCount = 0;
    let hasNotesData = false;

    // --- Revenue analysis ---
    let totalLifetimeValue = 0;
    let lifetimeValueCount = 0;
    let totalVisits = 0;
    let visitCount = 0;

    for (const customer of customers) {
      const data = customer.data as CustomerData | null;
      const vehicles = data?.vehicles || [];
      const visitNum = data?.importedVisitCount || 0;

      // Churn / at-risk scoring
      const lastVisit = parseDate(data?.importedLastVisit);
      const firstVisit = parseDate(data?.importedFirstVisit);
      if (lastVisit || firstVisit) hasDateData = true;
      const riskScore = getAtRiskScore(data, now);
      if (riskScore === "churned") churnedCount++;
      else if (riskScore === "at_risk") atRiskCount++;

      // Multi-vehicle
      if (vehicles.length > 1) {
        multiVehicleCustomers.push(customer);
      } else {
        singleVehicleCustomers.push(customer);
      }

      // Services
      if (customer.services.length > 0) {
        hasServiceData = true;
        const isExpress = isServiceType(customer.services, ['express', 'basic', 'wash', 'quick']);
        const isPremium = isServiceType(customer.services, ['premium', 'full', 'platinum', 'complete', 'ultimate', 'ceramic']);

        if (isExpress) {
          expressCustomers++;
          if (isPremium) expressToUpgradeCount++;
        }
      }

      // Location
      if (customer.locationType) {
        hasLocationData = true;
        if (isMobileLocation(customer.locationType)) {
          mobileCustomers.push(customer);
        } else if (isShopLocation(customer.locationType)) {
          shopCustomers.push(customer);
        }
      }

      // Seasonal
      if (lastVisit) {
        hasSeasonalData = true;
        monthCounts[lastVisit.getMonth()]++;
      }
      if (firstVisit && (!lastVisit || firstVisit.getMonth() !== lastVisit.getMonth())) {
        hasSeasonalData = true;
        monthCounts[firstVisit.getMonth()]++;
      }

      // Notes flagging
      const notes = data?.notes || '';
      if (notes) hasNotesData = true;
      if (isFlagged(notes)) flaggedCount++;

      // Revenue
      if (data?.importedLifetimeValue && data.importedLifetimeValue > 0) {
        totalLifetimeValue += data.importedLifetimeValue;
        lifetimeValueCount++;
      }
      if (visitNum > 0) {
        totalVisits += visitNum;
        visitCount++;
      }
    }

    // Calculate churn + at-risk rates
    // "Needs attention" = churned + at risk (combined metric for the summary)
    const needsAttention = churnedCount + atRiskCount;
    const churnRate = hasDateData
      ? Math.round((needsAttention / totalCustomers) * 100)
      : Math.round((totalCustomers * 0.78) / totalCustomers * 100);
    const lostCustomers = hasDateData
      ? needsAttention
      : Math.round(totalCustomers * 0.78);
    const atRiskRate = hasDateData
      ? Math.round((atRiskCount / totalCustomers) * 100)
      : 0;

    // Calculate revenue at risk
    const avgLTV = lifetimeValueCount > 0
      ? totalLifetimeValue / lifetimeValueCount
      : 145 * 2.4;
    const estimatedRevenueLost = Math.round(lostCustomers * avgLTV);

    // Multi-vehicle return rates
    const multiVehicleReturning = multiVehicleCustomers.filter(c => {
      const d = c.data as CustomerData | null;
      return isReturningCustomer(d, d?.importedVisitCount || 0);
    }).length;
    const singleVehicleReturning = singleVehicleCustomers.filter(c => {
      const d = c.data as CustomerData | null;
      return isReturningCustomer(d, d?.importedVisitCount || 0);
    }).length;

    const multiVehicleReturnRate = multiVehicleCustomers.length > 0
      ? Math.round((multiVehicleReturning / multiVehicleCustomers.length) * 100)
      : 0;
    const singleVehicleReturnRate = singleVehicleCustomers.length > 0
      ? Math.round((singleVehicleReturning / singleVehicleCustomers.length) * 100)
      : 0;

    // Express upgrade rate
    const expressUpgradeRate = expressCustomers > 0
      ? Math.round((expressToUpgradeCount / expressCustomers) * 100)
      : 0;

    // Location-based return rates
    const mobileReturning = mobileCustomers.filter(c => {
      const d = c.data as CustomerData | null;
      return isReturningCustomer(d, d?.importedVisitCount || 0);
    }).length;
    const shopReturning = shopCustomers.filter(c => {
      const d = c.data as CustomerData | null;
      return isReturningCustomer(d, d?.importedVisitCount || 0);
    }).length;

    const mobileReturnRate = mobileCustomers.length > 0
      ? Math.round((mobileReturning / mobileCustomers.length) * 100)
      : 0;
    const shopReturnRate = shopCustomers.length > 0
      ? Math.round((shopReturning / shopCustomers.length) * 100)
      : 0;

    // Seasonal peak/slow
    let peakMonth: string | null = null;
    let slowMonth: string | null = null;
    let peakToSlowRatio = 0;

    if (hasSeasonalData) {
      const nonZeroMonths = monthCounts.filter((c: number) => c > 0);
      if (nonZeroMonths.length >= 2) {
        const maxCount = Math.max(...monthCounts);
        const minNonZero = Math.min(...nonZeroMonths);
        const peakIdx = monthCounts.indexOf(maxCount);
        const slowIdx = monthCounts.indexOf(minNonZero);

        peakMonth = getMonthName(peakIdx);
        slowMonth = getMonthName(slowIdx);
        peakToSlowRatio = minNonZero > 0 ? Math.round((maxCount / minNonZero) * 10) / 10 : maxCount;
      }
    }

    // Averages
    const avgLifetimeValue = lifetimeValueCount > 0
      ? Math.round(totalLifetimeValue / lifetimeValueCount)
      : 0;
    const avgVisitsPerCustomer = visitCount > 0
      ? Math.round((totalVisits / visitCount) * 10) / 10
      : 0;

    return NextResponse.json({
      totalCustomers,
      churnRate,
      lostCustomers,
      atRiskCount,
      atRiskRate,
      churnedCount,
      estimatedRevenueLost,
      multiVehicleCount: multiVehicleCustomers.length,
      multiVehicleReturnRate,
      singleVehicleReturnRate,
      hasMultiVehicleData: multiVehicleCustomers.length > 0,
      expressUpgradeRate,
      hasServiceData,
      mobileReturnRate,
      shopReturnRate,
      hasLocationData,
      mobileCount: mobileCustomers.length,
      shopCount: shopCustomers.length,
      peakMonth,
      slowMonth,
      peakToSlowRatio,
      hasSeasonalData: hasSeasonalData && peakMonth !== null,
      flaggedCount,
      hasNotesData,
      avgLifetimeValue,
      avgVisitsPerCustomer,
    });
  } catch (error) {
    console.error('Error computing onboarding analytics:', error);
    return NextResponse.json({ error: 'Failed to compute analytics' }, { status: 500 });
  }
}
