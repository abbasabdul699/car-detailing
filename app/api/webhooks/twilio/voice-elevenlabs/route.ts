import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

const VoiceResponse = twilio.twiml.VoiceResponse;

// Helper function to generate speech using ElevenLabs
async function generateElevenLabsSpeech(text: string): Promise<string | null> {
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

    const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/pNInz6obpgDQGcFmaJgB', {
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
    console.log('=== ELEVENLABS VOICE WEBHOOK START ===');
    
    const formData = await request.formData();
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const callSid = formData.get('CallSid') as string;
    
    console.log('ElevenLabs - Incoming call:', { from, to, callSid });
    
    // Create TwiML response
    const twiml = new VoiceResponse();
    
    // Test ElevenLabs
    console.log('ElevenLabs - Testing ElevenLabs TTS...');
    const testAudio = await generateElevenLabsSpeech('Hello! This is a test of ElevenLabs voice. Can you hear me clearly?');
    
    if (testAudio) {
      console.log('ElevenLabs - Audio generated successfully, playing...');
      twiml.play(testAudio);
    } else {
      console.log('ElevenLabs - Audio generation failed, using fallback...');
      twiml.say({
        voice: 'Polly.Matthew',
        language: 'en-US'
      }, 'Hello! This is a fallback voice test. ElevenLabs is not working.');
    }
    
    console.log('ElevenLabs - TwiML generated successfully');
    
    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    });
    
  } catch (error) {
    console.error('=== ELEVENLABS VOICE WEBHOOK ERROR ===');
    console.error('Error details:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    
    // Return simple error response
    const twiml = new VoiceResponse();
    twiml.say({
      voice: 'Polly.Matthew',
      language: 'en-US'
    }, 'Sorry, there was an error with ElevenLabs. Please try again.');
    twiml.hangup();
    
    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}
