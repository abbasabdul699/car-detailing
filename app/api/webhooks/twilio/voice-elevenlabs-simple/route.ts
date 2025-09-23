import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

const VoiceResponse = twilio.twiml.VoiceResponse;

// ElevenLabs TTS function with shorter text to avoid size issues
async function generateElevenLabsSpeech(text: string, voice: string = 'pNInz6obpgDQGcFmaJgB'): Promise<string | null> {
  if (!process.env.ELEVENLABS_API_KEY) {
    console.error('ELEVENLABS_API_KEY is not set');
    return null;
  }

  try {
    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5
        }
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs TTS error:', response.status, errorText);
      return null;
    }

    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');
    
    // Check if the audio is too large (limit to ~50KB to stay under TwiML limits)
    if (audioBuffer.byteLength > 50000) {
      console.warn('ElevenLabs audio too large:', audioBuffer.byteLength, 'bytes, using fallback');
      return null;
    }
    
    console.log('ElevenLabs TTS successful, audio size:', audioBuffer.byteLength);
    return `data:audio/mpeg;base64,${base64Audio}`;
  } catch (error) {
    console.error('ElevenLabs TTS fetch error:', error);
    return null;
  }
}

// Main voice webhook with ElevenLabs TTS (simple approach)
export async function POST(request: NextRequest) {
  try {
    console.log('=== ELEVENLABS SIMPLE VOICE WEBHOOK START ===');
    
    const formData = await request.formData();
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const callSid = formData.get('CallSid') as string;
    
    console.log('ElevenLabs Simple Voice - Incoming call:', { from, to, callSid });
    
    // Create TwiML response
    const twiml = new VoiceResponse();
    
    // Use shorter greeting to reduce audio size
    const greetingMessage = 'Hello! Thanks for calling Reeva Car. How can I help you?';
    
    console.log('Attempting ElevenLabs TTS for greeting...');
    const elevenLabsAudio = await generateElevenLabsSpeech(greetingMessage);

    if (elevenLabsAudio) {
      console.log('Using ElevenLabs audio for greeting');
      twiml.play(elevenLabsAudio);
    } else {
      console.log('ElevenLabs failed for greeting, using Twilio fallback');
      twiml.say({
        voice: 'Polly.Matthew',
        language: 'en-US'
      }, greetingMessage);
    }
    
    // Add a pause
    twiml.pause({ length: 1 });
    
    // Use Twilio voice for the gather to avoid size issues
    const gather = twiml.gather({
      input: ['speech'],
      action: `/api/webhooks/twilio/voice-elevenlabs-simple/process`,
      method: 'POST',
      speechTimeout: 'auto',
      timeout: 10,
      language: 'en-US',
      enhanced: true,
      speechModel: 'phone_call'
    });
    
    gather.say({
      voice: 'Polly.Matthew',
      language: 'en-US'
    }, 'Please tell me what you need help with today.');
    
    // Fallback if no input
    twiml.say({
      voice: 'Polly.Matthew',
      language: 'en-US'
    }, 'I didn\'t hear anything. Please call back if you need assistance. Goodbye!');
    
    twiml.hangup();
    
    console.log('ElevenLabs Simple Voice - TwiML generated successfully');
    console.log('ElevenLabs Simple Voice - TwiML content:', twiml.toString());
    
    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    });
    
  } catch (error) {
    console.error('=== ELEVENLABS SIMPLE VOICE WEBHOOK ERROR ===');
    console.error('Error details:', error);
    
    // Return simple error response
    const twiml = new VoiceResponse();
    twiml.say({
      voice: 'Polly.Matthew',
      language: 'en-US'
    }, 'Sorry, there was an error in our voice system. Please try calling back later.');
    twiml.hangup();
    
    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}