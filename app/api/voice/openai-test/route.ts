import { NextRequest } from 'next/server';
import twilio from 'twilio';

const VoiceResponse = twilio.twiml.VoiceResponse;

// OpenAI TTS voices available
const OPENAI_VOICES = [
  { id: 'alloy', name: 'Alloy', description: 'Neutral, balanced voice' },
  { id: 'echo', name: 'Echo', description: 'Male voice with warmth' },
  { id: 'fable', name: 'Fable', description: 'British accent, storytelling voice' },
  { id: 'onyx', name: 'Onyx', description: 'Deep, rich male voice' },
  { id: 'nova', name: 'Nova', description: 'Young, energetic female voice' },
  { id: 'shimmer', name: 'Shimmer', description: 'Soft, gentle female voice' }
];

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const voiceId = url.searchParams.get('voice') || 'alloy';
  const voice = OPENAI_VOICES.find(v => v.id === voiceId) || OPENAI_VOICES[0];

  const twiml = new VoiceResponse();
  
  // Generate speech using OpenAI TTS
  try {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1', // or tts-1-hd for higher quality
        input: `Hello! This is the ${voice.name} voice from OpenAI. ${voice.description}. I'm here to help you with your car detailing needs. How can I assist you today?`,
        voice: voice.id,
        response_format: 'mp3',
        speed: 1.0
      })
    });

    if (response.ok) {
      const audioBuffer = await response.arrayBuffer();
      
      // Convert to base64 for Twilio
      const base64Audio = Buffer.from(audioBuffer).toString('base64');
      const dataUri = `data:audio/mp3;base64,${base64Audio}`;
      
      // Play the generated audio
      twiml.play(dataUri);
      
      // Add navigation instructions
      const nextVoice = OPENAI_VOICES[(OPENAI_VOICES.findIndex(v => v.id === voiceId) + 1) % OPENAI_VOICES.length];
      
      // Generate next instruction
      const instructionResponse = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: `To hear the next voice, ${nextVoice.name}, press 1. To repeat this voice, press 2. To end the demo, press 0.`,
          voice: voice.id,
          response_format: 'mp3',
          speed: 0.9
        })
      });

      if (instructionResponse.ok) {
        const instructionBuffer = await instructionResponse.arrayBuffer();
        const instructionBase64 = Buffer.from(instructionBuffer).toString('base64');
        const instructionDataUri = `data:audio/mp3;base64,${instructionBase64}`;
        twiml.play(instructionDataUri);
      }

      // Gather input for navigation
      const gather = twiml.gather({
        numDigits: 1,
        timeout: 10,
        action: `/api/voice/openai-test?voice=${nextVoice.id}`
      });

      // Fallback if no input
      twiml.redirect(`/api/voice/openai-test?voice=${nextVoice.id}`);

    } else {
      throw new Error(`OpenAI TTS error: ${response.status}`);
    }

  } catch (error) {
    console.error('OpenAI TTS error:', error);
    
    // Fallback to regular Twilio voice
    twiml.say({
      voice: 'Polly.Matthew',
      language: 'en-US',
      speechRate: 'medium'
    }, 'Sorry, there was an issue with the voice generation. Please try again later.');
    
    twiml.hangup();
  }

  return new Response(twiml.toString(), {
    headers: { 'Content-Type': 'text/xml' }
  });
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const digits = formData.get('Digits') as string;
  const currentVoice = formData.get('voice') as string;
  
  const twiml = new VoiceResponse();
  
  switch (digits) {
    case '1':
      // Next voice
      const currentIndex = OPENAI_VOICES.findIndex(v => v.id === currentVoice);
      const nextIndex = (currentIndex + 1) % OPENAI_VOICES.length;
      const nextVoice = OPENAI_VOICES[nextIndex];
      twiml.redirect(`/api/voice/openai-test?voice=${nextVoice.id}`);
      break;
    case '2':
      // Repeat current voice
      twiml.redirect(`/api/voice/openai-test?voice=${currentVoice}`);
      break;
    case '0':
      // End demo
      try {
        const endResponse = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'tts-1',
            input: 'Thank you for testing the OpenAI voice options. Goodbye!',
            voice: currentVoice,
            response_format: 'mp3',
            speed: 1.0
          })
        });

        if (endResponse.ok) {
          const endBuffer = await endResponse.arrayBuffer();
          const endBase64 = Buffer.from(endBuffer).toString('base64');
          const endDataUri = `data:audio/mp3;base64,${endBase64}`;
          twiml.play(endDataUri);
        }
      } catch (error) {
        twiml.say({
          voice: 'Polly.Matthew',
          language: 'en-US',
          speechRate: 'medium'
        }, 'Thank you for testing. Goodbye!');
      }
      twiml.hangup();
      break;
    default:
      // Invalid input, repeat current voice
      twiml.redirect(`/api/voice/openai-test?voice=${currentVoice}`);
  }

  return new Response(twiml.toString(), {
    headers: { 'Content-Type': 'text/xml' }
  });
}
