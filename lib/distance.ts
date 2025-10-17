/**
 * Distance calculation utilities for service radius validation
 */

/**
 * Calculate the distance between two coordinates using the Haversine formula
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in miles
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Check if a customer address is within the detailer's service radius
 * @param detailerLat Detailer's latitude
 * @param detailerLon Detailer's longitude
 * @param customerLat Customer's latitude
 * @param customerLon Customer's longitude
 * @param serviceRadius Service radius in miles
 * @returns Object with isWithinRadius boolean and distance in miles
 */
export function isWithinServiceRadius(
  detailerLat: number,
  detailerLon: number,
  customerLat: number,
  customerLon: number,
  serviceRadius: number
): { isWithinRadius: boolean; distance: number } {
  const distance = calculateDistance(detailerLat, detailerLon, customerLat, customerLon);
  
  return {
    isWithinRadius: distance <= serviceRadius,
    distance
  };
}

/**
 * Geocode an address to get coordinates using Google Maps Geocoding API
 * @param address Full address string
 * @returns Promise with latitude and longitude
 */
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${process.env.GOOGLE_MAPS_API_KEY}`
    );
    
    const data = await response.json();
    
    if (data.status === 'OK' && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return {
        lat: location.lat,
        lng: location.lng
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error geocoding address:', error);
    return null;
  }
}

/**
 * Validate if a customer's address is within service radius
 * @param detailer Detailer object with lat/lng and serviceRadius
 * @param customerAddress Customer's full address
 * @returns Promise with validation result
 */
export async function validateServiceRadius(
  detailer: { latitude: number; longitude: number; serviceRadius: number },
  customerAddress: string
): Promise<{ isValid: boolean; distance: number; message: string }> {
  // Geocode the customer's address
  const customerCoords = await geocodeAddress(customerAddress);
  
  if (!customerCoords) {
    return {
      isValid: false,
      distance: 0,
      message: "Sorry, I couldn't find that address. Please provide a complete address with city and state."
    };
  }
  
  // Check if within service radius
  const { isWithinRadius, distance } = isWithinServiceRadius(
    detailer.latitude,
    detailer.longitude,
    customerCoords.lat,
    customerCoords.lng,
    detailer.serviceRadius
  );
  
  if (isWithinRadius) {
    return {
      isValid: true,
      distance,
      message: `Great! You're ${distance} miles away, which is within our service area.`
    };
  } else {
    return {
      isValid: false,
      distance,
      message: `I'm sorry, but you're ${distance} miles away, which is outside our service radius of ${detailer.serviceRadius} miles. We currently only service customers within ${detailer.serviceRadius} miles of our location.`
    };
  }
}
