import { NextRequest } from 'next/server';
import twilio from 'twilio';

const VoiceResponse = twilio.twiml.VoiceResponse;

// ElevenLabs voice options
const ELEVENLABS_VOICES = [
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', description: 'Deep, warm male voice' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', description: 'Clear, professional female voice' },
  { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli', description: 'Young, energetic female voice' },
  { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh', description: 'Friendly, conversational male voice' },
  { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold', description: 'Confident, authoritative male voice' },
  { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', description: 'Professional, clear female voice' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', description: 'Smooth, natural male voice' },
  { id: 'LcfcDJNUP1GQjkzn1xUU', name: 'Thomas', description: 'Friendly, approachable male voice' }
];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const digits = formData.get('Digits') as string;
    const currentVoice = parseInt(formData.get('voice') as string || '0');
    
    const twiml = new VoiceResponse();
    
    if (digits) {
      const voiceIndex = parseInt(digits) - 1; // Convert 1-8 to 0-7
      
      if (voiceIndex >= 0 && voiceIndex < ELEVENLABS_VOICES.length) {
        const selectedVoice = ELEVENLABS_VOICES[voiceIndex];
        
        // Play voice demo
        const demoResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${selectedVoice.id}`, {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': process.env.ELEVENLABS_API_KEY || ''
          },
          body: JSON.stringify({
            text: `Hello! This is the ${selectedVoice.name} voice from ElevenLabs. ${selectedVoice.description}. I'm ready to help you with your car detailing needs. How can I assist you today?`,
            model_id: 'eleven_monolingual_v1',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.5
            }
          })
        });

        if (demoResponse.ok) {
          const audioBuffer = await demoResponse.arrayBuffer();
          const base64Audio = Buffer.from(audioBuffer).toString('base64');
          const dataUri = `data:audio/mpeg;base64,${base64Audio}`;
          twiml.play(dataUri);
        } else {
          twiml.say({
            voice: 'Polly.Matthew',
            language: 'en-US',
            speechRate: 'medium'
          }, `This is the ${selectedVoice.name} voice. ${selectedVoice.description}.`);
        }

        // Start conversation with selected voice
        const gather = twiml.gather({
          input: ['speech'],
          action: `/api/voice/elevenlabs-test?voice=${selectedVoice.id}`,
          method: 'POST',
          speechTimeout: 'auto',
          timeout: 10,
          language: 'en-US',
          enhanced: true,
          speechModel: 'phone_call'
        });

        const conversationPrompt = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${selectedVoice.id}`, {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': process.env.ELEVENLABS_API_KEY || ''
          },
          body: JSON.stringify({
            text: 'What can I help you with today?',
            model_id: 'eleven_monolingual_v1',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.5
            }
          })
        });

        if (conversationPrompt.ok) {
          const audioBuffer = await conversationPrompt.arrayBuffer();
          const base64Audio = Buffer.from(audioBuffer).toString('base64');
          const dataUri = `data:audio/mpeg;base64,${base64Audio}`;
          gather.play(dataUri);
        } else {
          gather.say({
            voice: 'Polly.Matthew',
            language: 'en-US'
          }, 'What can I help you with today?');
        }

        return new Response(twiml.toString(), {
          headers: { 'Content-Type': 'text/xml' }
        });
      }
    }

    // Fallback to voice selection
    twiml.redirect('/api/voice/elevenlabs-demo');

  } catch (error) {
    console.error('ElevenLabs demo error:', error);
    
    const twiml = new VoiceResponse();
    twiml.say({
      voice: 'Polly.Matthew',
      language: 'en-US'
    }, 'Sorry, there was an issue with the ElevenLabs demo.');
    twiml.hangup();

    return new Response(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' }
    });
  }
}

export async function GET(request: NextRequest) {
  try {
    const twiml = new VoiceResponse();
    
    // Welcome message
    twiml.say({
      voice: 'Polly.Matthew',
      language: 'en-US',
      speechRate: 'medium'
    }, 'Welcome to the ElevenLabs voice demo! I\'ll play different voices for you to choose from.');
    
    // Voice selection menu
    twiml.say({
      voice: 'Polly.Matthew',
      language: 'en-US',
      speechRate: 'slow'
    }, 'Press 1 for Adam, a deep warm male voice. Press 2 for Bella, a clear professional female voice. Press 3 for Elli, a young energetic female voice. Press 4 for Josh, a friendly conversational male voice. Press 5 for Arnold, a confident authoritative male voice. Press 6 for Domi, a professional clear female voice. Press 7 for Antoni, a smooth natural male voice. Press 8 for Thomas, a friendly approachable male voice.');
    
    // Gather input
    const gather = twiml.gather({
      numDigits: 1,
      timeout: 15,
      action: '/api/voice/elevenlabs-demo'
    });
    
    // Fallback
    twiml.say({
      voice: 'Polly.Matthew',
      language: 'en-US'
    }, 'I didn\'t receive any input. Please call back and try again.');
    twiml.hangup();

    return new Response(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' }
    });

  } catch (error) {
    console.error('ElevenLabs demo greeting error:', error);
    
    const twiml = new VoiceResponse();
    twiml.say({
      voice: 'Polly.Matthew',
      language: 'en-US'
    }, 'Sorry, there was an issue starting the ElevenLabs demo.');
    twiml.hangup();

    return new Response(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' }
    });
  }
}
