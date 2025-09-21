import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

const VoiceResponse = twilio.twiml.VoiceResponse;

// Helper function to generate speech using ElevenLabs
async function generateElevenLabsSpeech(text: string, voice: string = 'pNInz6obpgDQGcFmaJgB'): Promise<string | null> {
  try {
    console.log('ElevenLabs - Generating speech for:', text);
    
    if (!process.env.ELEVENLABS_API_KEY) {
      console.log('ElevenLabs - No API key found');
      return null;
    }

    // Clean up the text for better speech synthesis
    let cleanText = text
      .replace(/[^\w\s.,!?-]/g, '') // Remove special characters but keep hyphens
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    console.log('ElevenLabs - Clean text:', cleanText);

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text: cleanText,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5
        }
      })
    });

    console.log('ElevenLabs - Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs - API error:', response.status, errorText);
      return null;
    }

    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');
    const audioUrl = `data:audio/mpeg;base64,${base64Audio}`;
    
    console.log('ElevenLabs - Audio generated successfully, length:', base64Audio.length);
    return audioUrl;

  } catch (error) {
    console.error('ElevenLabs - Error generating speech:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== ELEVENLABS WORKING VOICE WEBHOOK START ===');
    
    const formData = await request.formData();
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const callSid = formData.get('CallSid') as string;
    
    console.log('ElevenLabs Working - Incoming call:', { from, to, callSid });
    
    // Create TwiML response
    const twiml = new VoiceResponse();
    
    // Try ElevenLabs first
    console.log('ElevenLabs Working - Testing ElevenLabs TTS...');
    const greetingText = 'Hello! Thanks for calling Reeva Car. This is a test of our ElevenLabs voice system. Can you hear me clearly?';
    const greetingAudio = await generateElevenLabsSpeech(greetingText, 'pNInz6obpgDQGcFmaJgB');
    
    if (greetingAudio) {
      console.log('ElevenLabs Working - Using ElevenLabs audio');
      twiml.play(greetingAudio);
    } else {
      console.log('ElevenLabs Working - ElevenLabs failed, using Twilio fallback');
      twiml.say({
        voice: 'Polly.Matthew',
        language: 'en-US'
      }, 'Hello! Thanks for calling Reeva Car. This is a test of our voice system using Twilio voice. Can you hear me clearly?');
    }
    
    console.log('ElevenLabs Working - TwiML generated successfully');
    
    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    });
    
  } catch (error) {
    console.error('=== ELEVENLABS WORKING VOICE WEBHOOK ERROR ===');
    console.error('Error details:', error);
    
    // Return simple error response
    const twiml = new VoiceResponse();
    twiml.say({
      voice: 'Polly.Matthew',
      language: 'en-US'
    }, 'Sorry, there was an error in the ElevenLabs test. Please try again.');
    twiml.hangup();
    
    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}
