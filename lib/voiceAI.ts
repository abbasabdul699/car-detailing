// Voice AI Configuration and Utilities
export interface VoiceConfig {
  voiceId: string;
  modelId: string;
  stability: number;
  similarityBoost: number;
  useCache: boolean;
}

export interface VoiceState {
  step: 'greeting' | 'name' | 'vehicle' | 'services' | 'address' | 'date' | 'time' | 'email' | 'confirmation' | 'complete';
  customerName?: string;
  vehicle?: string;
  vehicleYear?: number;
  vehicleMake?: string;
  vehicleModel?: string;
  services?: string[];
  address?: string;
  locationType?: 'home' | 'work' | 'other';
  preferredDate?: string;
  preferredTime?: string;
  customerEmail?: string;
  isFirstTime?: boolean;
  conversationId?: string;
  detailerId?: string;
}

// ElevenLabs voice options
export const VOICE_OPTIONS = {
  // Professional male voices
  ADAM: 'pNInz6obpgDQGcFmaJgB', // Adam - Professional, clear
  ANTONI: 'ErXwobaYiN019PkySvjV', // Antoni - Warm, friendly
  ARNOLD: 'VR6AewLTigWG4xSOukaG', // Arnold - Deep, authoritative
  
  // Professional female voices
  BELLA: 'EXAVITQu4vr4xnSDxMaL', // Bella - Professional, clear
  ELLA: 'MF3mGyEYCl7XYWbV9V6O', // Ella - Warm, friendly
  RACHEL: '21m00Tcm4TlvDq8ikWAM', // Rachel - Professional, articulate
  
  // Casual voices
  JOSH: 'TxGEqnHWrfWFTfGW9XjX', // Josh - Casual, friendly
  SAM: 'yoZ06aMxZJJ28mfd3POQ', // Sam - Casual, approachable
};

// Default voice configuration
export const DEFAULT_VOICE_CONFIG: VoiceConfig = {
  voiceId: VOICE_OPTIONS.ADAM,
  modelId: 'eleven_monolingual_v1',
  stability: 0.5,
  similarityBoost: 0.5,
  useCache: true
};

// Voice cache for performance
const voiceCache = new Map<string, string>();

// ElevenLabs voice synthesis with caching
export async function synthesizeVoice(
  text: string, 
  config: VoiceConfig = DEFAULT_VOICE_CONFIG
): Promise<string> {
  // Check cache first if enabled
  if (config.useCache) {
    const cacheKey = `${text}-${config.voiceId}`;
    if (voiceCache.has(cacheKey)) {
      return voiceCache.get(cacheKey)!;
    }
  }

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${config.voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY || ''
      },
      body: JSON.stringify({
        text: text,
        model_id: config.modelId,
        voice_settings: {
          stability: config.stability,
          similarity_boost: config.similarityBoost
        }
      })
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status} - ${response.statusText}`);
    }

    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');
    const audioUrl = `data:audio/mpeg;base64,${base64Audio}`;
    
    // Cache the result if enabled
    if (config.useCache) {
      const cacheKey = `${text}-${config.voiceId}`;
      voiceCache.set(cacheKey, audioUrl);
    }
    
    return audioUrl;
  } catch (error) {
    console.error('ElevenLabs synthesis error:', error);
    return '';
  }
}

// Generate TwiML response for voice
export function generateTwiMLResponse(
  sayText: string, 
  audioUrl?: string, 
  gatherNext: boolean = true,
  timeout: number = 10
): string {
  let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';
  
  if (audioUrl) {
    twiml += `<Play>${audioUrl}</Play>`;
  } else {
    twiml += `<Say voice="alice">${sayText}</Say>`;
  }
  
  if (gatherNext) {
    twiml += `<Gather numDigits="1" action="/api/webhooks/voice/process" method="POST" finishOnKey="#" timeout="${timeout}"/>`;
  } else {
    twiml += '<Hangup/>';
  }
  
  twiml += '</Response>';
  
  return twiml;
}

// Voice conversation flow templates
export const VOICE_TEMPLATES = {
  GREETING: (businessName: string, isFirstTime: boolean, customerName?: string) => {
    if (isFirstTime) {
      return `Hi! I'm calling from ${businessName}. I received your interest in our mobile car detailing services. To help you book an appointment, I'll need to collect some information. Is that okay with you?`;
    } else {
      return `Hi ${customerName || 'there'}! This is ${businessName}. How can I help you today?`;
    }
  },
  
  NAME_REQUEST: () => "Great! What's your name?",
  
  VEHICLE_REQUEST: (customerName: string) => `Nice to meet you, ${customerName}! What kind of vehicle do you have? Please tell me the year, make, and model.`,
  
  SERVICES_REQUEST: (vehicle: string) => `Perfect! A ${vehicle}. What services are you interested in? We offer interior detailing, exterior wash, ceramic coating, and full detail packages.`,
  
  ADDRESS_REQUEST: (services: string[]) => `Excellent! ${services.join(' and ')} sounds great. Where would you like us to perform the service? Please give me your complete address.`,
  
  LOCATION_TYPE_REQUEST: (address: string) => `Got it! ${address}. Is this your home, work, or another location?`,
  
  DATE_REQUEST: (locationType: string) => `Perfect! What date would work best for you? You can say today, tomorrow, or a specific date.`,
  
  TIME_REQUEST: (date: string) => `Great! What time would work best for you? You can say morning, afternoon, evening, or a specific time like 2 PM.`,
  
  EMAIL_REQUEST: (time: string) => `Perfect! What's your email address? This is optional but helps us send you confirmations and reminders.`,
  
  CONFIRMATION: (state: VoiceState) => {
    const dateStr = state.preferredDate || 'your preferred date';
    const timeStr = state.preferredTime || 'your preferred time';
    return `Perfect! Let me confirm your appointment: ${state.customerName}, ${state.vehicle}, ${state.services?.join(' and ')}, at ${state.address}, on ${dateStr} at ${timeStr}. Does this sound correct?`;
  },
  
  COMPLETION: (businessName: string) => `Excellent! Your appointment is confirmed. We'll send you a text confirmation shortly. Thank you for choosing ${businessName}!`,
  
  ERROR_RETRY: (step: string) => `I didn't catch that. Could you please ${step}?`,
  
  GOODBYE: () => "Thank you for calling. Have a great day!"
};

// Voice input processing utilities
export function parseVehicleInput(input: string): { year?: number; make?: string; model?: string; fullText: string } {
  const fullText = input.trim();
  const vehicleMatch = input.match(/(\d{4})\s+(\w+)\s+(.+)/i);
  
  if (vehicleMatch) {
    return {
      year: parseInt(vehicleMatch[1]),
      make: vehicleMatch[2],
      model: vehicleMatch[3],
      fullText
    };
  }
  
  return { fullText };
}

export function parseServicesInput(input: string): string[] {
  const services = [];
  const lowerInput = input.toLowerCase();
  
  if (lowerInput.includes('interior')) services.push('Interior Detail');
  if (lowerInput.includes('exterior')) services.push('Exterior Wash');
  if (lowerInput.includes('ceramic')) services.push('Ceramic Coating');
  if (lowerInput.includes('full') || lowerInput.includes('complete')) services.push('Full Detail');
  if (lowerInput.includes('wash')) services.push('Car Wash');
  if (lowerInput.includes('detail')) services.push('Detailing');
  
  return services.length > 0 ? services : ['Detailing'];
}

export function parseLocationType(input: string): 'home' | 'work' | 'other' {
  const lowerInput = input.toLowerCase();
  
  if (lowerInput.includes('home') || lowerInput.includes('house')) return 'home';
  if (lowerInput.includes('work') || lowerInput.includes('office')) return 'work';
  return 'other';
}

export function parseDateInput(input: string): Date {
  const lowerInput = input.toLowerCase();
  const today = new Date();
  
  if (lowerInput.includes('today')) {
    return today;
  } else if (lowerInput.includes('tomorrow')) {
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    return tomorrow;
  } else {
    // Try to parse specific date
    const dateMatch = input.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
    if (dateMatch) {
      const month = parseInt(dateMatch[1]) - 1;
      const day = parseInt(dateMatch[2]);
      const year = dateMatch[3] ? parseInt(dateMatch[3]) : today.getFullYear();
      return new Date(year, month, day);
    }
  }
  
  return today;
}

export function parseTimeInput(input: string): string {
  const lowerInput = input.toLowerCase();
  
  if (lowerInput.includes('morning')) return '9:00 AM';
  if (lowerInput.includes('afternoon')) return '1:00 PM';
  if (lowerInput.includes('evening') || lowerInput.includes('night')) return '6:00 PM';
  
  // Try to parse specific time
  const timeMatch = input.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  if (timeMatch) {
    const hour = timeMatch[1];
    const minute = timeMatch[2] || '00';
    const period = timeMatch[3].toUpperCase();
    return `${hour}:${minute} ${period}`;
  }
  
  return '2:00 PM'; // Default time
}

// Voice conversation state management
export class VoiceConversationManager {
  private state: VoiceState;
  private detailer: any;
  
  constructor(detailer: any, conversationId: string) {
    this.detailer = detailer;
    this.state = {
      step: 'greeting',
      isFirstTime: true,
      conversationId,
      detailerId: detailer.id
    };
  }
  
  async processInput(input: string): Promise<{ response: string; audioUrl?: string; isComplete: boolean }> {
    const { response, newState, isComplete, audioUrl } = await this.processVoiceInput(input);
    this.state = newState;
    return { response, audioUrl, isComplete };
  }
  
  private async processVoiceInput(userInput: string): Promise<{ response: string; newState: VoiceState; isComplete: boolean; audioUrl?: string }> {
    const lowerInput = userInput.toLowerCase().trim();
    let response = '';
    let newState = { ...this.state };
    let isComplete = false;
    let audioUrl: string | undefined;

    console.log('Processing voice input:', { step: this.state.step, input: userInput });

    switch (this.state.step) {
      case 'greeting':
        response = VOICE_TEMPLATES.GREETING(this.detailer.businessName, this.state.isFirstTime!, this.state.customerName);
        newState.step = 'name';
        break;

      case 'name':
        if (lowerInput.includes('yes') || lowerInput.includes('okay') || lowerInput.includes('sure')) {
          response = VOICE_TEMPLATES.NAME_REQUEST();
        } else if (userInput.trim().length > 0) {
          newState.customerName = userInput.trim();
          response = VOICE_TEMPLATES.VEHICLE_REQUEST(newState.customerName);
          newState.step = 'vehicle';
        } else {
          response = VOICE_TEMPLATES.ERROR_RETRY('tell me your name');
        }
        break;

      case 'vehicle':
        if (userInput.trim().length > 0) {
          const vehicleData = parseVehicleInput(userInput);
          newState.vehicle = vehicleData.fullText;
          newState.vehicleYear = vehicleData.year;
          newState.vehicleMake = vehicleData.make;
          newState.vehicleModel = vehicleData.model;
          
          response = VOICE_TEMPLATES.SERVICES_REQUEST(newState.vehicle);
          newState.step = 'services';
        } else {
          response = VOICE_TEMPLATES.ERROR_RETRY('tell me about your vehicle');
        }
        break;

      case 'services':
        if (userInput.trim().length > 0) {
          newState.services = parseServicesInput(userInput);
          response = VOICE_TEMPLATES.ADDRESS_REQUEST(newState.services);
          newState.step = 'address';
        } else {
          response = VOICE_TEMPLATES.ERROR_RETRY('tell me what services you want');
        }
        break;

      case 'address':
        if (userInput.trim().length > 0) {
          newState.address = userInput.trim();
          response = VOICE_TEMPLATES.LOCATION_TYPE_REQUEST(newState.address);
          newState.step = 'date';
        } else {
          response = VOICE_TEMPLATES.ERROR_RETRY('give me your complete address');
        }
        break;

      case 'date':
        if (userInput.trim().length > 0) {
          newState.locationType = parseLocationType(userInput);
          response = VOICE_TEMPLATES.DATE_REQUEST(newState.locationType || 'location');
          newState.step = 'time';
        } else {
          response = VOICE_TEMPLATES.ERROR_RETRY('tell me the location type');
        }
        break;

      case 'time':
        if (userInput.trim().length > 0) {
          newState.preferredDate = userInput.trim();
          response = VOICE_TEMPLATES.TIME_REQUEST(newState.preferredDate);
          newState.step = 'email';
        } else {
          response = VOICE_TEMPLATES.ERROR_RETRY('tell me what date works');
        }
        break;

      case 'email':
        if (userInput.trim().length > 0) {
          newState.preferredTime = parseTimeInput(userInput);
          response = VOICE_TEMPLATES.EMAIL_REQUEST(newState.preferredTime);
          newState.step = 'confirmation';
        } else {
          response = VOICE_TEMPLATES.ERROR_RETRY('tell me what time works');
        }
        break;

      case 'confirmation':
        if (userInput.trim().length > 0 && userInput.includes('@')) {
          newState.customerEmail = userInput.trim();
        }
        
        response = VOICE_TEMPLATES.CONFIRMATION(newState);
        newState.step = 'complete';
        break;

      case 'complete':
        if (lowerInput.includes('yes') || lowerInput.includes('correct') || lowerInput.includes('perfect')) {
          response = VOICE_TEMPLATES.COMPLETION(this.detailer.businessName);
          isComplete = true;
        } else {
          response = "Let me know if you'd like to change anything about your appointment.";
        }
        break;
    }

    // Generate audio for important responses
    if (this.state.step === 'greeting' || this.state.step === 'confirmation' || isComplete) {
      try {
        audioUrl = await synthesizeVoice(response);
      } catch (error) {
        console.error('Error generating audio:', error);
      }
    }

    return { response, newState, isComplete, audioUrl };
  }
  
  getState(): VoiceState {
    return this.state;
  }
}
