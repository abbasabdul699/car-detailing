import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

const VoiceResponse = twilio.twiml.VoiceResponse;

// Helper function to generate speech using ElevenLabs TTS and return a URL
async function generateElevenLabsSpeechURL(text: string, voice: string = 'pNInz6obpgDQGcFmaJgB'): Promise<string | null> {
  if (!process.env.ELEVENLABS_API_KEY) {
    console.error('ELEVENLABS_API_KEY is not set.');
    return null;
  }

  try {
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
      })
    });

    if (response.ok) {
      const audioBuffer = await response.arrayBuffer();
      
      // Upload to a temporary URL service or use a different approach
      // For now, let's try using a direct URL to the audio file
      // This is a placeholder - we need to implement proper audio hosting
      
      // Return null for now to test the fallback
      console.log('ElevenLabs audio generated successfully, but URL hosting not implemented');
      return null;
    } else {
      console.error('ElevenLabs TTS error:', response.status, await response.text());
      return null;
    }
  } catch (error) {
    console.error('ElevenLabs TTS fetch error:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== ELEVENLABS URL WEBHOOK START ===');

    const formData = await request.formData();
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const callSid = formData.get('CallSid') as string;

    console.log('ElevenLabs URL - Incoming call:', { from, to, callSid });

    const twiml = new VoiceResponse();
    const testMessage = 'Hello! This is a test of our ElevenLabs voice system using URL hosting. Can you hear me clearly?';

    // Try ElevenLabs with URL hosting
    const elevenLabsAudioURL = await generateElevenLabsSpeechURL(testMessage);

    if (elevenLabsAudioURL) {
      twiml.play(elevenLabsAudioURL);
      console.log('ElevenLabs URL - TwiML with ElevenLabs audio URL generated successfully');
    } else {
      // Fallback to Twilio voice
      twiml.say({
        voice: 'Polly.Matthew',
        language: 'en-US'
      }, 'Hello! This is a test of our voice system using Twilio voice. ElevenLabs URL hosting is not implemented yet.');
      console.log('ElevenLabs URL - TwiML with Twilio fallback audio generated successfully');
    }

    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    });

  } catch (error) {
    console.error('=== ELEVENLABS URL WEBHOOK ERROR ===');
    console.error('Error details:', error);

    const twiml = new VoiceResponse();
    twiml.say({
      voice: 'Polly.Matthew',
      language: 'en-US'
    }, 'Sorry, there was an error in the ElevenLabs URL test. Please try again.');
    twiml.hangup();

    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}
