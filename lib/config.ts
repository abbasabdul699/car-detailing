/**
 * Shared configuration for API base URLs and validation
 */

export const BASE_URL = 
  process.env.INTERNAL_API_BASE ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const TIMEZONE = "America/New_York";
export const DEFAULT_DURATION_MINUTES = 120;
