import { NextResponse } from 'next/server';

// Available Twilio voices
const VOICES = [
  // Amazon Polly Voices
  { id: 'Polly.Matthew', name: 'Matthew (Male, US)', description: 'Current voice - Professional male' },
  { id: 'Polly.Joanna', name: 'Joanna (Female, US)', description: 'Clear, professional female' },
  { id: 'Polly.Joey', name: 'Joey (Male, US)', description: 'Friendly, conversational male' },
  { id: 'Polly.Kimberly', name: 'Kimberly (Female, US)', description: 'Warm, conversational female' },
  { id: 'Polly.Salli', name: 'Salli (Female, US)', description: 'Young, energetic female' },
  { id: 'Polly.Amy', name: 'Amy (Female, UK)', description: 'British female accent' },
  { id: 'Polly.Emma', name: 'Emma (Female, UK)', description: 'British female accent' },
  { id: 'Polly.Brian', name: 'Brian (Male, UK)', description: 'British male accent' },
  { id: 'Polly.Arthur', name: 'Arthur (Male, UK)', description: 'British male accent' },
  
  // Google Cloud Voices (Standard)
  { id: 'Google.en-US-Standard-A', name: 'Google A (Male, US)', description: 'Standard male voice' },
  { id: 'Google.en-US-Standard-B', name: 'Google B (Female, US)', description: 'Standard female voice' },
  { id: 'Google.en-US-Standard-C', name: 'Google C (Female, US)', description: 'Standard female voice' },
  { id: 'Google.en-US-Standard-D', name: 'Google D (Male, US)', description: 'Standard male voice' },
  { id: 'Google.en-US-Standard-E', name: 'Google E (Female, US)', description: 'Standard female voice' },
  { id: 'Google.en-US-Standard-F', name: 'Google F (Female, US)', description: 'Standard female voice' },
  { id: 'Google.en-US-Standard-G', name: 'Google G (Female, US)', description: 'Standard female voice' },
  { id: 'Google.en-US-Standard-H', name: 'Google H (Male, US)', description: 'Standard male voice' },
  { id: 'Google.en-US-Standard-I', name: 'Google I (Female, US)', description: 'Standard female voice' },
  { id: 'Google.en-US-Standard-J', name: 'Google J (Male, US)', description: 'Standard male voice' },
  
  // Google Cloud Neural Voices (More Natural)
  { id: 'Google.en-US-Neural2-A', name: 'Neural A (Male, US)', description: 'AI neural male voice - Very natural' },
  { id: 'Google.en-US-Neural2-C', name: 'Neural C (Female, US)', description: 'AI neural female voice - Very natural' },
  { id: 'Google.en-US-Neural2-D', name: 'Neural D (Male, US)', description: 'AI neural male voice - Very natural' },
  { id: 'Google.en-US-Neural2-E', name: 'Neural E (Female, US)', description: 'AI neural female voice - Very natural' },
  { id: 'Google.en-US-Neural2-F', name: 'Neural F (Female, US)', description: 'AI neural female voice - Very natural' },
  { id: 'Google.en-US-Neural2-G', name: 'Google G (Female, US)', description: 'AI neural female voice - Very natural' },
  { id: 'Google.en-US-Neural2-H', name: 'Neural H (Male, US)', description: 'AI neural male voice - Very natural' },
  { id: 'Google.en-US-Neural2-I', name: 'Neural I (Female, US)', description: 'AI neural female voice - Very natural' },
  { id: 'Google.en-US-Neural2-J', name: 'Neural J (Male, US)', description: 'AI neural male voice - Very natural' },
];

export async function GET() {
  return NextResponse.json({
    message: "Available Twilio Voices for Car Detailing AI",
    totalVoices: VOICES.length,
    recommendation: "Try the Google Neural voices first - they sound the most natural and human-like",
    voices: VOICES.map((voice, index) => ({
      ...voice,
      index,
      demoUrl: `https://www.reevacar.com/api/voice/demo?voice=${index}`,
      category: voice.id.startsWith('Polly') ? 'Amazon Polly' : 
                voice.id.includes('Neural') ? 'Google Neural (Recommended)' : 'Google Standard'
    }))
  });
}
