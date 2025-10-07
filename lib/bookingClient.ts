/**
 * Robust booking API client with proper error handling and idempotency
 * Fixes: content-type guards, idempotency keys, and proper error handling
 */

export interface BookingRequest {
  detailerId: string;
  date: string;
  time: string;
  durationMinutes?: number;
  tz?: string;
  title?: string;
  customerName?: string;
  customerPhone?: string;
  vehicleType?: string;
  vehicleLocation?: string;
  services?: string[];
  source?: string;
}

export interface BookingResponse {
  ok: boolean;
  bookingId?: string;
  eventId?: string;
  startUtcISO?: string;
  endUtcISO?: string;
  message?: string;
  error?: string;
  suggestions?: Array<{ startLocal: string; startISO: string }>;
}

/**
 * Make a robust booking API call with proper error handling
 */
export async function createBookingRobust(
  request: BookingRequest,
  idempotencyKey: string,
  baseUrl?: string
): Promise<BookingResponse> {
  const url = `${baseUrl || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/bookings/create`;
  
  console.log('Creating booking with idempotency key:', idempotencyKey);
  console.log('Booking request:', request);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey, // Prevent duplicate bookings
        'X-Request-ID': idempotencyKey, // For tracking
      },
      body: JSON.stringify(request)
    });

    // Guard against non-JSON responses
    const contentType = response.headers.get('content-type') || '';
    
    if (!response.ok || !contentType.includes('application/json')) {
      const text = await response.text(); // Read as text first
      console.error('Booking API failed:', {
        status: response.status,
        statusText: response.statusText,
        contentType,
        body: text.slice(0, 500) // Log first 500 chars safely
      });
      
      throw new Error(`Booking API failed: ${response.status} – ${contentType} – ${text.slice(0, 500)}`);
    }

    const data = await response.json();
    
    if (response.ok && data.ok) {
      console.log('✅ Booking created successfully:', data.bookingId);
      return data;
    } else {
      console.log('❌ Booking conflict or error:', data);
      return data; // Return the error response
    }

  } catch (error) {
    console.error('❌ Booking creation error:', error);
    
    // Handle specific error types
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to reach booking service');
    }
    
    if (error instanceof SyntaxError) {
      throw new Error('Invalid response format from booking service');
    }
    
    // Re-throw with more context
    throw new Error(`Booking creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate an idempotency key from Twilio message or conversation data
 */
export function generateIdempotencyKey(
  messageSid: string,
  detailerId: string,
  customerPhone: string,
  date: string,
  time: string
): string {
  // Use a combination that ensures uniqueness but allows retries
  const key = `${detailerId}:${customerPhone}:${date}:${time}:${messageSid}`;
  
  // Hash it to make it shorter and more secure
  return Buffer.from(key).toString('base64').replace(/[+/=]/g, '').slice(0, 32);
}

/**
 * Check if a booking already exists to avoid duplicates
 */
export async function checkExistingBooking(
  detailerId: string,
  customerPhone: string,
  date: string,
  time: string,
  baseUrl?: string
): Promise<boolean> {
  try {
    const url = `${baseUrl || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/bookings/check`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        detailerId,
        customerPhone,
        date,
        time
      })
    });

    if (!response.ok) {
      console.warn('Failed to check existing booking, assuming none exists');
      return false;
    }

    const data = await response.json();
    return data.exists || false;

  } catch (error) {
    console.error('Error checking existing booking:', error);
    return false; // Assume no existing booking if check fails
  }
}

/**
 * Retry booking creation with exponential backoff
 */
export async function createBookingWithRetry(
  request: BookingRequest,
  idempotencyKey: string,
  maxRetries: number = 3,
  baseUrl?: string
): Promise<BookingResponse> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Booking attempt ${attempt}/${maxRetries}`);
      
      // Check for existing booking on first attempt
      if (attempt === 1) {
        const exists = await checkExistingBooking(
          request.detailerId,
          request.customerPhone || '',
          request.date,
          request.time,
          baseUrl
        );
        
        if (exists) {
          return {
            ok: false,
            error: 'Booking already exists for this customer and time',
            message: 'You already have an appointment scheduled for this time.'
          };
        }
      }
      
      const result = await createBookingRobust(request, idempotencyKey, baseUrl);
      
      if (result.ok) {
        return result;
      }
      
      // If it's a conflict error, don't retry
      if (result.error && (result.error.includes('conflict') || result.error.includes('already booked'))) {
        return result;
      }
      
      // For other errors, prepare for retry
      lastError = new Error(result.error || 'Unknown booking error');
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      console.error(`Booking attempt ${attempt} failed:`, error);
    }
    
    // Wait before retrying (exponential backoff)
    if (attempt < maxRetries) {
      const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
      console.log(`Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // All retries failed
  throw lastError || new Error('All booking attempts failed');
}
