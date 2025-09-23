import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

const VoiceResponse = twilio.twiml.VoiceResponse;

// ElevenLabs TTS function with timeout
async function generateElevenLabsSpeech(text: string, voice: string = 'pNInz6obpgDQGcFmaJgB'): Promise<string | null> {
  if (!process.env.ELEVENLABS_API_KEY) {
    console.error('ELEVENLABS_API_KEY is not set');
    return null;
  }

  try {
    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

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

    if (response.ok) {
      const audioBuffer = await response.arrayBuffer();
      const base64Audio = Buffer.from(audioBuffer).toString('base64');
      console.log('ElevenLabs TTS successful, audio size:', audioBuffer.byteLength);
      return `data:audio/mpeg;base64,${base64Audio}`;
    } else {
      const errorText = await response.text();
      console.error('ElevenLabs TTS error:', response.status, errorText);
      return null;
    }
  } catch (error) {
    console.error('ElevenLabs TTS fetch error:', error);
    return null;
  }
}

// Simple test endpoint for ElevenLabs voice
export async function POST(request: NextRequest) {
  try {
    console.log('=== ELEVENLABS VOICE TEST START ===');
    
    const formData = await request.formData();
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const callSid = formData.get('CallSid') as string;
    
    console.log('ElevenLabs Test - Incoming call:', { from, to, callSid });
    
    // Create TwiML response
    const twiml = new VoiceResponse();
    
    const testMessage = 'Hello! This is a test of our ElevenLabs AI voice system. Can you hear the natural voice clearly?';
    
    console.log('Attempting ElevenLabs TTS for test...');
    const elevenLabsAudio = await generateElevenLabsSpeech(testMessage);

    if (elevenLabsAudio) {
      console.log('Using ElevenLabs audio for test');
      twiml.play(elevenLabsAudio);
      
      // Add a follow-up with Twilio for comparison
      twiml.pause({ length: 2 });
      twiml.say({
        voice: 'Polly.Matthew',
        language: 'en-US'
      }, 'Now you\'re hearing Twilio\'s voice for comparison. The ElevenLabs voice should sound more natural.');
    } else {
      console.log('ElevenLabs failed, using Twilio fallback');
      twiml.say({
        voice: 'Polly.Matthew',
        language: 'en-US'
      }, 'Hello! This is a test using Twilio voice. ElevenLabs is not working right now, so you\'re hearing the fallback voice.');
    }
    
    twiml.pause({ length: 2 });
    twiml.say({
      voice: 'Polly.Matthew',
      language: 'en-US'
    }, 'Test completed. Thank you for calling!');
    
    twiml.hangup();
    
    console.log('ElevenLabs Test - TwiML generated successfully');
    
    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    });
    
  } catch (error) {
    console.error('=== ELEVENLABS VOICE TEST ERROR ===');
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
