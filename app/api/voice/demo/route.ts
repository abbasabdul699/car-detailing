import { NextRequest } from 'next/server';
import twilio from 'twilio';

const VoiceResponse = twilio.twiml.VoiceResponse;

// Available Twilio voices to test
const VOICES = [
  // Amazon Polly Voices
  { id: 'Polly.Matthew', name: 'Matthew (Male, US)', description: 'Current voice' },
  { id: 'Polly.Joanna', name: 'Joanna (Female, US)', description: 'Clear, professional female' },
  { id: 'Polly.Joey', name: 'Joey (Male, US)', description: 'Friendly male voice' },
  { id: 'Polly.Kimberly', name: 'Kimberly (Female, US)', description: 'Warm, conversational female' },
  { id: 'Polly.Salli', name: 'Salli (Female, US)', description: 'Young, energetic female' },
  { id: 'Polly.Amy', name: 'Amy (Female, UK)', description: 'British female accent' },
  { id: 'Polly.Emma', name: 'Emma (Female, UK)', description: 'British female accent' },
  { id: 'Polly.Brian', name: 'Brian (Male, UK)', description: 'British male accent' },
  { id: 'Polly.Arthur', name: 'Arthur (Male, UK)', description: 'British male accent' },
  
  // Google Cloud Voices
  { id: 'Google.en-US-Standard-A', name: 'Google A (Male, US)', description: 'Standard male' },
  { id: 'Google.en-US-Standard-B', name: 'Google B (Female, US)', description: 'Standard female' },
  { id: 'Google.en-US-Standard-C', name: 'Google C (Female, US)', description: 'Standard female' },
  { id: 'Google.en-US-Standard-D', name: 'Google D (Male, US)', description: 'Standard male' },
  { id: 'Google.en-US-Standard-E', name: 'Google E (Female, US)', description: 'Standard female' },
  { id: 'Google.en-US-Standard-F', name: 'Google F (Female, US)', description: 'Standard female' },
  { id: 'Google.en-US-Standard-G', name: 'Google G (Female, US)', description: 'Standard female' },
  { id: 'Google.en-US-Standard-H', name: 'Google H (Male, US)', description: 'Standard male' },
  { id: 'Google.en-US-Standard-I', name: 'Google I (Female, US)', description: 'Standard female' },
  { id: 'Google.en-US-Standard-J', name: 'Google J (Male, US)', description: 'Standard male' },
  
  // Neural voices (more natural)
  { id: 'Google.en-US-Neural2-A', name: 'Neural A (Male, US)', description: 'AI neural male voice' },
  { id: 'Google.en-US-Neural2-C', name: 'Neural C (Female, US)', description: 'AI neural female voice' },
  { id: 'Google.en-US-Neural2-D', name: 'Neural D (Male, US)', description: 'AI neural male voice' },
  { id: 'Google.en-US-Neural2-E', name: 'Neural E (Female, US)', description: 'AI neural female voice' },
  { id: 'Google.en-US-Neural2-F', name: 'Neural F (Female, US)', description: 'AI neural female voice' },
  { id: 'Google.en-US-Neural2-G', name: 'Neural G (Female, US)', description: 'AI neural female voice' },
  { id: 'Google.en-US-Neural2-H', name: 'Neural H (Male, US)', description: 'AI neural male voice' },
  { id: 'Google.en-US-Neural2-I', name: 'Neural I (Female, US)', description: 'AI neural female voice' },
  { id: 'Google.en-US-Neural2-J', name: 'Neural J (Male, US)', description: 'AI neural male voice' },
];

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const voiceIndex = parseInt(url.searchParams.get('voice') || '0');
  const voice = VOICES[voiceIndex] || VOICES[0];

  const twiml = new VoiceResponse();
  
  const message = `Hello! This is ${voice.name}. ${voice.description}. I'm here to help you with your car detailing needs. How can I assist you today?`;
  
  twiml.say({
    voice: voice.id,
    language: 'en-US',
    speechRate: 'medium'
  }, message);

  // Add navigation instructions
  const nextIndex = (voiceIndex + 1) % VOICES.length;
  const nextVoice = VOICES[nextIndex];
  
  twiml.say({
    voice: voice.id,
    language: 'en-US',
    speechRate: 'slow'
  }, `To hear the next voice, ${nextVoice.name}, press 1. To repeat this voice, press 2. To end the demo, press 0.`);

  // Gather input for navigation
  const gather = twiml.gather({
    numDigits: 1,
    timeout: 10,
    action: `/api/voice/demo?voice=${nextIndex}`
  });

  gather.say({
    voice: voice.id,
    language: 'en-US',
    speechRate: 'slow'
  }, 'Please make your selection now.');

  // Fallback if no input
  twiml.redirect(`/api/voice/demo?voice=${nextIndex}`);

  return new Response(twiml.toString(), {
    headers: { 'Content-Type': 'text/xml' }
  });
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const digits = formData.get('Digits') as string;
  const currentVoice = parseInt(formData.get('voice') as string || '0');
  
  const twiml = new VoiceResponse();
  
  switch (digits) {
    case '1':
      // Next voice
      const nextIndex = (currentVoice + 1) % VOICES.length;
      twiml.redirect(`/api/voice/demo?voice=${nextIndex}`);
      break;
    case '2':
      // Repeat current voice
      twiml.redirect(`/api/voice/demo?voice=${currentVoice}`);
      break;
    case '0':
      // End demo
      twiml.say({
        voice: 'Polly.Matthew',
        language: 'en-US',
        speechRate: 'medium'
      }, 'Thank you for testing the voice options. Goodbye!');
      twiml.hangup();
      break;
    default:
      // Invalid input, repeat current voice
      twiml.redirect(`/api/voice/demo?voice=${currentVoice}`);
  }

  return new Response(twiml.toString(), {
    headers: { 'Content-Type': 'text/xml' }
  });
}
