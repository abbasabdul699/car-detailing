import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function calculateDistance(point1: { lat: number; lng: number }, point2: { lat: number; lng: number }) {
  const R = 3958.8; // Earth's radius in miles
  const lat1 = point1.lat * Math.PI / 180;
  const lat2 = point2.lat * Math.PI / 180;
  const lon1 = point1.lng * Math.PI / 180;
  const lon2 = point2.lng * Math.PI / 180;

  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;

  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Number((R * c).toFixed(1)); // Distance in miles
}

/**
 * Convert minutes to a human-readable hours and minutes format
 * @param minutes - Duration in minutes
 * @returns Formatted string like "2 hours", "1.5 hours", "30 minutes", "2 hours 30 minutes"
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minutes`
  }
  
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  
  if (remainingMinutes === 0) {
    return hours === 1 ? "1 hour" : `${hours} hours`
  }
  
  const hourText = hours === 1 ? "1 hour" : `${hours} hours`
  const minuteText = remainingMinutes === 1 ? "1 minute" : `${remainingMinutes} minutes`
  
  return `${hourText} ${minuteText}`
}
