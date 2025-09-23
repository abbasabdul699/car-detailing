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

// Process voice input from the ElevenLabs hosted webhook
export async function POST(request: NextRequest) {
  try {
    console.log('=== ELEVENLABS HOSTED PROCESS WEBHOOK START ===');
    
    const formData = await request.formData();
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const callSid = formData.get('CallSid') as string;
    const transcription = formData.get('SpeechResult') as string;
    const confidence = parseFloat(formData.get('Confidence') as string || '0');
    
    console.log('ElevenLabs Hosted Process - Input received:', {
      from,
      to,
      callSid,
      transcription,
      confidence,
    });

    const twiml = new VoiceResponse();

    // Check transcription confidence
    if (confidence < 0.5) {
      console.log('ElevenLabs Hosted Process - Low confidence, asking for repeat');
      
      const repeatMessage = 'I\'m sorry, I didn\'t quite catch that. Could you please repeat what you said?';
      const repeatAudioUrl = await generateAndHostElevenLabsSpeech(repeatMessage);
      
      if (repeatAudioUrl) {
        twiml.play(repeatAudioUrl);
      } else {
        twiml.say({
          voice: 'Polly.Matthew',
          language: 'en-US'
        }, repeatMessage);
      }
      
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

      return new NextResponse(twiml.toString(), {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // Process the transcription and generate a response
    let response = '';
    const lowerText = transcription.toLowerCase();
    
    if (lowerText.includes('book') || lowerText.includes('appointment') || lowerText.includes('schedule')) {
      response = 'I can help you book an appointment! What type of car detailing service are you looking for? We offer interior cleaning, exterior detailing, and full service packages.';
    } else if (lowerText.includes('price') || lowerText.includes('cost') || lowerText.includes('how much')) {
      response = 'Our pricing depends on the type of service you need. We offer interior cleaning, exterior detailing, and full service packages. Would you like to know more about any specific service?';
    } else if (lowerText.includes('location') || lowerText.includes('where') || lowerText.includes('address')) {
      response = 'We provide mobile car detailing services and can come to your location. What\'s your address or general area?';
    } else if (lowerText.includes('time') || lowerText.includes('when') || lowerText.includes('available')) {
      response = 'We have flexible scheduling available. What day and time works best for you?';
    } else if (lowerText.includes('thank') || lowerText.includes('bye') || lowerText.includes('goodbye')) {
      response = 'Thank you for calling Reeva Car! Have a great day and we look forward to serving you.';
    } else {
      response = 'I understand you said: ' + transcription + '. How else can I help you with your car detailing needs today?';
    }

    console.log('ElevenLabs Hosted Process - Generated response:', response);
    
    // Generate ElevenLabs audio for the response
    const responseAudioUrl = await generateAndHostElevenLabsSpeech(response);
    
    if (responseAudioUrl) {
      console.log('Using ElevenLabs hosted audio for response:', responseAudioUrl);
      twiml.play(responseAudioUrl);
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
      action: `/api/webhooks/twilio/voice-elevenlabs-hosted/process`,
      method: 'POST',
      speechTimeout: 'auto',
      timeout: 10,
      language: 'en-US',
      enhanced: true,
      speechModel: 'phone_call'
    });
    
    const followUpMessage = 'Is there anything else I can help you with?';
    const followUpAudioUrl = await generateAndHostElevenLabsSpeech(followUpMessage);
    
    if (followUpAudioUrl) {
      gather.play(followUpAudioUrl);
    } else {
      gather.say({
        voice: 'Polly.Matthew',
        language: 'en-US'
      }, followUpMessage);
    }
    
    // Fallback
    const goodbyeMessage = 'Thank you for calling Reeva Car. Have a great day!';
    const goodbyeAudioUrl = await generateAndHostElevenLabsSpeech(goodbyeMessage);
    
    if (goodbyeAudioUrl) {
      twiml.play(goodbyeAudioUrl);
    } else {
      twiml.say({
        voice: 'Polly.Matthew',
        language: 'en-US'
      }, goodbyeMessage);
    }
    
    twiml.hangup();
    
    console.log('ElevenLabs Hosted Process - TwiML generated:', twiml.toString());
    
    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    });
    
  } catch (error) {
    console.error('=== ELEVENLABS HOSTED PROCESS WEBHOOK ERROR ===');
    console.error('Error details:', error);
    
    // Return simple error response
    const twiml = new VoiceResponse();
    twiml.say({
      voice: 'Polly.Matthew',
      language: 'en-US'
    }, 'I\'m sorry, I\'m having trouble processing your request right now. Please try calling back later.');
    twiml.hangup();
    
    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}
