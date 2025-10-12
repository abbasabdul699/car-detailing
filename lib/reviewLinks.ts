/**
 * Generate Google Review links for detailers
 */

export interface ReviewLinkOptions {
  detailerId: string;
  businessName: string;
  customerName?: string;
  serviceType?: string;
  customReviewLink?: string;
}

/**
 * Generate a Google Review link for a detailer
 * @param options - Review link generation options
 * @returns Google Review URL
 */
export function generateGoogleReviewLink(options: ReviewLinkOptions): string {
  const { businessName, customReviewLink } = options;
  
  // If detailer has provided a custom Google Review link, use it
  if (customReviewLink && customReviewLink.trim()) {
    return customReviewLink.trim();
  }
  
  // Fallback: Create a search query for the business
  const searchQuery = encodeURIComponent(`${businessName} car detailing`);
  
  // Base Google Maps search URL that will show the business and allow reviews
  const baseUrl = `https://maps.google.com/search/${searchQuery}`;
  
  // Add review-specific parameters
  const params = new URLSearchParams({
    'hl': 'en', // Language
    'gl': 'US', // Country
  });
  
  const reviewUrl = `${baseUrl}?${params.toString()}`;
  
  return reviewUrl;
}

/**
 * Generate a personalized review message
 * @param options - Review link generation options
 * @returns Personalized review message
 */
export function generateReviewMessage(options: ReviewLinkOptions): string {
  const { businessName, customerName, serviceType } = options;
  
  const greeting = customerName ? `Hi ${customerName}!` : 'Hi there!';
  const serviceText = serviceType ? ` your ${serviceType}` : ' your car detailing service';
  
  return `${greeting} 

Hope you enjoyed${serviceText}! 🚗✨

We'd love to hear about your experience. If you have a moment, would you mind leaving us a review on Google? It really helps other customers find us!

🔗 Leave a review: ${generateGoogleReviewLink(options)}

Thank you so much! 🙏

- ${businessName}`;
}

/**
 * Generate a shorter review message for SMS
 * @param options - Review link generation options
 * @returns Short review message for SMS
 */
export function generateShortReviewMessage(options: ReviewLinkOptions): string {
  const { businessName, customerName, serviceType } = options;
  
  const greeting = customerName ? `${customerName}` : 'there';
  
  return `Hi ${greeting}! Hope you enjoyed your ${serviceType || 'car detailing'}! 🚗✨

We'd love a quick review if you have a moment:
${generateGoogleReviewLink(options)}

Thanks! - ${businessName}`;
}
