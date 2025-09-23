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

// Process voice input from the ElevenLabs simple webhook
export async function POST(request: NextRequest) {
  try {
    console.log('=== ELEVENLABS SIMPLE PROCESS WEBHOOK START ===');
    
    const formData = await request.formData();
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const callSid = formData.get('CallSid') as string;
    const transcription = formData.get('SpeechResult') as string;
    const confidence = parseFloat(formData.get('Confidence') as string || '0');
    
    console.log('ElevenLabs Simple Process - Input received:', {
      from,
      to,
      callSid,
      transcription,
      confidence,
    });

    const twiml = new VoiceResponse();

    // Check transcription confidence
    if (confidence < 0.5) {
      console.log('ElevenLabs Simple Process - Low confidence, asking for repeat');
      
      const repeatMessage = 'Sorry, I didn\'t catch that. Can you repeat?';
      const repeatAudio = await generateElevenLabsSpeech(repeatMessage);
      
      if (repeatAudio) {
        twiml.play(repeatAudio);
      } else {
        twiml.say({
          voice: 'Polly.Matthew',
          language: 'en-US'
        }, repeatMessage);
      }
      
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

      return new NextResponse(twiml.toString(), {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // Process the transcription and generate a response
    let response = '';
    const lowerText = transcription.toLowerCase();
    
    if (lowerText.includes('book') || lowerText.includes('appointment') || lowerText.includes('schedule')) {
      response = 'I can help you book an appointment! What service do you need?';
    } else if (lowerText.includes('price') || lowerText.includes('cost') || lowerText.includes('how much')) {
      response = 'Our pricing varies by service. We offer interior, exterior, and full detailing.';
    } else if (lowerText.includes('location') || lowerText.includes('where') || lowerText.includes('address')) {
      response = 'We provide mobile services. What\'s your location?';
    } else if (lowerText.includes('time') || lowerText.includes('when') || lowerText.includes('available')) {
      response = 'We have flexible scheduling. What day works for you?';
    } else if (lowerText.includes('thank') || lowerText.includes('bye') || lowerText.includes('goodbye')) {
      response = 'Thank you for calling Reeva Car! Have a great day!';
    } else {
      response = 'I understand. How else can I help you today?';
    }

    console.log('ElevenLabs Simple Process - Generated response:', response);
    
    // Generate ElevenLabs audio for the response
    const responseAudio = await generateElevenLabsSpeech(response);
    
    if (responseAudio) {
      console.log('Using ElevenLabs audio for response');
      twiml.play(responseAudio);
    } else {
      console.log('Using Twilio fallback for response');
      twiml.say({
        voice: 'Polly.Matthew',
        language: 'en-US'
      }, response);
    }
    
    // Ask if they need anything else
    twiml.pause({ length: 1 });
    
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
    }, 'Anything else I can help with?');
    
    // Fallback
    twiml.say({
      voice: 'Polly.Matthew',
      language: 'en-US'
    }, 'Thank you for calling Reeva Car. Goodbye!');
    
    twiml.hangup();
    
    console.log('ElevenLabs Simple Process - TwiML generated:', twiml.toString());
    
    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    });
    
  } catch (error) {
    console.error('=== ELEVENLABS SIMPLE PROCESS WEBHOOK ERROR ===');
    console.error('Error details:', error);
    
    // Return simple error response
    const twiml = new VoiceResponse();
    twiml.say({
      voice: 'Polly.Matthew',
      language: 'en-US'
    }, 'I\'m sorry, I\'m having trouble right now. Please try calling back later.');
    twiml.hangup();
    
    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}
