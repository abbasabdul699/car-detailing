interface Detailer {
  businessName?: string;
  firstName?: string;
  lastName?: string;
  description?: string;
  services?: Array<any>;
  businessHours?: Array<any>;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  images?: Array<any>;
  email?: string;
  phone?: string;
  instagram?: string;
  tiktok?: string;
  website?: string;
}

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

export function checkProfileCompletion(detailer: Detailer): ProfileCompletionFields {
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

export function isProfileComplete(detailer: Detailer): boolean {
  const completionStatus = checkProfileCompletion(detailer);
  return Object.values(completionStatus).every(field => field === true);
}

export function getCompletionPercentage(detailer: Detailer): number {
  const completionStatus = checkProfileCompletion(detailer);
  const totalFields = Object.keys(completionStatus).length;
  const completedFields = Object.values(completionStatus).filter(field => field === true).length;
  return Math.round((completedFields / totalFields) * 100);
} 