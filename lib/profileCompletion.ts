import { Detailer as PrismaDetailer, DetailerService, PortfolioImage } from '@prisma/client';

export interface ProfileCompletionFields {
  businessName: boolean;
  description: boolean;
  services: boolean;
  hours: boolean;
  location: boolean;
  images: boolean;
  contact: boolean;
  socialMedia: boolean;
}

export type DetailerWithRelations = PrismaDetailer & {
    services: DetailerService[];
    portfolioImages: PortfolioImage[];
};

export function checkProfileCompletion(detailer: PrismaDetailer): ProfileCompletionFields {
  return {
    businessName: Boolean(detailer.businessName?.trim()),
    description: Boolean(detailer.description?.trim()),
    services: Array.isArray(detailer.services) && detailer.services.length > 0,
    hours: Array.isArray(detailer.businessHours) && detailer.businessHours.length === 7,
    location: Boolean(detailer.address && detailer.city && detailer.state && detailer.zipCode),
    images: Array.isArray(detailer.images) && detailer.images.length > 0,
    contact: Boolean(detailer.email && detailer.phone?.trim()),
    socialMedia: Boolean(detailer.instagram || detailer.tiktok || detailer.website)
  };
}

export function isProfileComplete(detailer: PrismaDetailer): boolean {
  const completionStatus = checkProfileCompletion(detailer);
  return Object.values(completionStatus).every(field => field === true);
}

export function getCompletionPercentage(detailer: PrismaDetailer): number {
  const completionStatus = checkProfileCompletion(detailer);
  const totalFields = Object.keys(completionStatus).length;
  const completedFields = Object.values(completionStatus).filter(field => field === true).length;
  return Math.round((completedFields / totalFields) * 100);
}

// Define the criteria for a complete profile
const PROFILE_CRITERIA = {
  personalInfo: (d: DetailerWithRelations) => !!(d.firstName && d.lastName),
  businessName: (d: DetailerWithRelations) => !!d.businessName,
  contact: (d: DetailerWithRelations) => !!d.phone,
  address: (d: DetailerWithRelations) => !!(d.address && d.city && d.state && d.zipCode),
  description: (d: DetailerWithRelations) => !!(d.description && d.description.length > 20),
  businessHours: (d: DetailerWithRelations) => {
    try {
      const hours = d.businessHours as any;
      if (!hours || typeof hours !== 'object') return false;
      // Check if at least one day has both open and close times set
      return Object.values(hours).some((times: any) => {
        return Array.isArray(times) && times.length === 2 && times[0] && times[1];
      });
    } catch {
      return false;
    }
  },
  services: (d: DetailerWithRelations) => d.services && d.services.length > 0,
  portfolio: (d: DetailerWithRelations) => d.portfolioImages && d.portfolioImages.length > 0,
};

type CriteriaKeys = keyof typeof PROFILE_CRITERIA;

export const calculateProfileCompletion = (detailer: DetailerWithRelations | null | undefined): { percentage: number; missing: string[] } => {
  if (!detailer) {
    return { percentage: 0, missing: Object.keys(PROFILE_CRITERIA) };
  }

  let completedCount = 0;
  const missing: string[] = [];

  (Object.keys(PROFILE_CRITERIA) as CriteriaKeys[]).forEach(key => {
    if (PROFILE_CRITERIA[key](detailer)) {
      completedCount++;
    } else {
      missing.push(key);
    }
  });

  const totalCriteria = Object.keys(PROFILE_CRITERIA).length;
  const percentage = Math.round((completedCount / totalCriteria) * 100);

  return { percentage, missing };
};

export const getCompletionMessage = (missing: string[]): string => {
    if (missing.length === 0) {
        return "Your profile is complete! Well done."
    }

    const messages = {
        personalInfo: "Add your first and last name",
        businessName: "Add your business name",
        contact: "Add your phone number",
        address: "Complete your business address",
        description: "Write a short description of your business (at least 20 characters)",
        businessHours: "Set your business hours",
        services: "Add at least one service",
        portfolio: "Upload at least one portfolio image",
    }

    const nextStep = missing[0] as keyof typeof messages;
    return `Next step: ${messages[nextStep]}`;
} 