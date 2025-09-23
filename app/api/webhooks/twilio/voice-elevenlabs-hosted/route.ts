import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

const VoiceResponse = twilio.twiml.VoiceResponse;

// ElevenLabs TTS function that returns a hosted URL instead of base64
async function generateAndHostElevenLabsSpeech(text: string, voice: string = 'pNInz6obpgDQGcFmaJgB'): Promise<string | null> {
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

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs TTS error:', response.status, errorText);
      return null;
    }

    const audioBuffer = await response.arrayBuffer();
    console.log('ElevenLabs TTS successful, audio size:', audioBuffer.byteLength);
    
    // Instead of returning base64, we'll upload to a temporary hosting solution
    // For now, let's use a simple approach with a temporary file endpoint
    const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
    const formData = new FormData();
    formData.append('audio', audioBlob, 'elevenlabs-audio.mp3');
    
    // Upload to our temporary audio hosting endpoint
    const uploadResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/upload/elevenlabs-audio`, {
      method: 'POST',
      body: formData
    });
    
    if (uploadResponse.ok) {
      const uploadData = await uploadResponse.json();
      return uploadData.url;
    } else {
      console.error('Failed to upload audio:', await uploadResponse.text());
      return null;
    }
  } catch (error) {
    console.error('ElevenLabs TTS fetch error:', error);
    return null;
  }
}

// Main voice webhook with ElevenLabs TTS (hosted approach)
export async function POST(request: NextRequest) {
  try {
    console.log('=== ELEVENLABS HOSTED VOICE WEBHOOK START ===');
    
    const formData = await request.formData();
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const callSid = formData.get('CallSid') as string;
    
    console.log('ElevenLabs Hosted Voice - Incoming call:', { from, to, callSid });
    
    // Create TwiML response
    const twiml = new VoiceResponse();
    
    const greetingMessage = 'Hello! Thanks for calling Reeva Car. This is our AI voice assistant powered by ElevenLabs. Can you hear me clearly?';
    
    console.log('Attempting ElevenLabs TTS for greeting...');
    const elevenLabsAudioUrl = await generateAndHostElevenLabsSpeech(greetingMessage);

    if (elevenLabsAudioUrl) {
      console.log('Using ElevenLabs hosted audio for greeting:', elevenLabsAudioUrl);
      twiml.play(elevenLabsAudioUrl);
    } else {
      console.log('ElevenLabs failed for greeting, using Twilio fallback');
      twiml.say({
        voice: 'Polly.Matthew',
        language: 'en-US'
      }, 'Hello! Thanks for calling Reeva Car. This is our voice system. Can you hear me clearly?');
    }
    
    // Add a pause to let the caller respond
    twiml.pause({ length: 2 });
    
    // Ask for input with ElevenLabs
    const questionMessage = 'How can I help you today?';
    const questionAudioUrl = await generateAndHostElevenLabsSpeech(questionMessage);
    
    const gather = twiml.gather({
      input: ['speech'],
      action: `/api/webhooks/twilio/voice-elevenlabs-hosted/process`,
      method: 'POST',
      speechTimeout: 'auto',
      timeout: 10,
      language: 'en-US',
      enhanced: true,
      speechModel: 'phone_call'
    });
    
    if (questionAudioUrl) {
      console.log('Using ElevenLabs hosted audio for question:', questionAudioUrl);
      gather.play(questionAudioUrl);
    } else {
      console.log('Using Twilio fallback for question');
      gather.say({
        voice: 'Polly.Matthew',
        language: 'en-US'
      }, questionMessage);
    }
    
    // Fallback if no input
    const fallbackMessage = 'I didn\'t hear anything. Please call back if you need assistance. Goodbye!';
    const fallbackAudioUrl = await generateAndHostElevenLabsSpeech(fallbackMessage);
    
    if (fallbackAudioUrl) {
      console.log('Using ElevenLabs hosted audio for fallback:', fallbackAudioUrl);
      twiml.play(fallbackAudioUrl);
    } else {
      twiml.say({
        voice: 'Polly.Matthew',
        language: 'en-US'
      }, fallbackMessage);
    }
    
    twiml.hangup();
    
    console.log('ElevenLabs Hosted Voice - TwiML generated successfully');
    console.log('ElevenLabs Hosted Voice - TwiML content:', twiml.toString());
    
    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    });
    
  } catch (error) {
    console.error('=== ELEVENLABS HOSTED VOICE WEBHOOK ERROR ===');
    console.error('Error details:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    
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