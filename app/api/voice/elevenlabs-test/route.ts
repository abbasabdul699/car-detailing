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
  { id: 'LcfcDJNUP1GQjkzn1xUU', name: 'Thomas', description: 'Friendly, approachable male voice' },
  { id: 'VR6AewLTigWG4xSOukaG', name: 'Charlie', description: 'Warm, conversational male voice' },
  { id: 'XB0fDUnXU5T71ol4uaFk', name: 'Emily', description: 'Professional, clear female voice' }
];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const transcription = formData.get('SpeechResult') as string;
    const confidence = parseFloat(formData.get('Confidence') as string || '0');
    const voiceId = formData.get('voice') as string || ELEVENLABS_VOICES[0].id;
    
    const twiml = new VoiceResponse();
    
    if (transcription && confidence > 0.3) {
      console.log('ElevenLabs test - User said:', transcription);
      
      // Get AI response
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { 
              role: 'system', 
              content: `You're having a conversation with a customer calling a car detailing business. Sound natural and conversational like a real person. Use casual language, show enthusiasm, and be helpful. Keep responses concise but friendly.`
            },
            { role: 'user', content: transcription }
          ],
          max_tokens: 100,
          temperature: 0.8
        })
      });

      if (response.ok) {
        const data = await response.json();
        const aiResponse = data.choices[0]?.message?.content || 'Sorry, what was that?';
        
        console.log('ElevenLabs test - AI responding:', aiResponse);
        
        // Generate speech with ElevenLabs or fallback
        if (process.env.ELEVENLABS_API_KEY) {
          const speechResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
            method: 'POST',
            headers: {
              'Accept': 'audio/mpeg',
              'Content-Type': 'application/json',
              'xi-api-key': process.env.ELEVENLABS_API_KEY
            },
            body: JSON.stringify({
              text: aiResponse,
              model_id: 'eleven_monolingual_v1',
              voice_settings: {
                stability: 0.5,
                similarity_boost: 0.5
              }
            })
          });

          if (speechResponse.ok) {
            const audioBuffer = await speechResponse.arrayBuffer();
            const base64Audio = Buffer.from(audioBuffer).toString('base64');
            const dataUri = `data:audio/mpeg;base64,${base64Audio}`;
            twiml.play(dataUri);
          } else {
            console.error('ElevenLabs TTS error:', speechResponse.status, await speechResponse.text());
            // Fallback to Twilio voice
            twiml.say({
              voice: 'Polly.Matthew',
              language: 'en-US',
              speechRate: 'medium'
            }, aiResponse);
          }
        } else {
          // Fallback to Twilio voice when ElevenLabs API key is not set
          twiml.say({
            voice: 'Polly.Matthew',
            language: 'en-US',
            speechRate: 'medium'
          }, aiResponse);
        }
      }
    } else {
      // Low confidence or no speech
      if (process.env.ELEVENLABS_API_KEY) {
        const lowConfidenceResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': process.env.ELEVENLABS_API_KEY
          },
          body: JSON.stringify({
            text: 'Sorry, I didn\'t catch that. Could you repeat that?',
            model_id: 'eleven_monolingual_v1',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.5
            }
          })
        });

        if (lowConfidenceResponse.ok) {
          const audioBuffer = await lowConfidenceResponse.arrayBuffer();
          const base64Audio = Buffer.from(audioBuffer).toString('base64');
          const dataUri = `data:audio/mpeg;base64,${base64Audio}`;
          twiml.play(dataUri);
        } else {
          twiml.say({
            voice: 'Polly.Matthew',
            language: 'en-US',
            speechRate: 'medium'
          }, 'Sorry, I didn\'t catch that. Could you repeat that?');
        }
      } else {
        twiml.say({
          voice: 'Polly.Matthew',
          language: 'en-US',
          speechRate: 'medium'
        }, 'Sorry, I didn\'t catch that. Could you repeat that?');
      }
    }

    // Continue conversation
    const gather = twiml.gather({
      input: ['speech'],
      action: `/api/voice/elevenlabs-test?voice=${voiceId}`,
      method: 'POST',
      speechTimeout: 'auto',
      timeout: 10,
      language: 'en-US',
      enhanced: true,
      speechModel: 'phone_call'
    });

    // Fallback
    twiml.say({
      voice: 'Polly.Matthew',
      language: 'en-US'
    }, 'Thanks for testing ElevenLabs voices! Goodbye!');
    twiml.hangup();

    return new Response(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' }
    });

  } catch (error) {
    console.error('ElevenLabs test error:', error);
    
    const twiml = new VoiceResponse();
    twiml.say({
      voice: 'Polly.Matthew',
      language: 'en-US'
    }, 'Sorry, there was a technical issue with the ElevenLabs test.');
    twiml.hangup();

    return new Response(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' }
    });
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const voiceId = url.searchParams.get('voice') || ELEVENLABS_VOICES[0].id;
    const voice = ELEVENLABS_VOICES.find(v => v.id === voiceId) || ELEVENLABS_VOICES[0];
    
    const twiml = new VoiceResponse();
    
    const greeting = `Hey! Welcome to the ElevenLabs voice test. I'm using the ${voice.name} voice - ${voice.description}. How can I help you today?`;
    
    if (process.env.ELEVENLABS_API_KEY) {
      const greetingResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': process.env.ELEVENLABS_API_KEY
        },
        body: JSON.stringify({
          text: greeting,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5
          }
        })
      });

      if (greetingResponse.ok) {
        const audioBuffer = await greetingResponse.arrayBuffer();
        const base64Audio = Buffer.from(audioBuffer).toString('base64');
        const dataUri = `data:audio/mpeg;base64,${base64Audio}`;
        twiml.play(dataUri);
      } else {
        console.error('ElevenLabs greeting error:', greetingResponse.status, await greetingResponse.text());
        twiml.say({
          voice: 'Polly.Matthew',
          language: 'en-US',
          speechRate: 'medium'
        }, greeting);
      }
    } else {
      // Fallback when ElevenLabs API key is not set
      twiml.say({
        voice: 'Polly.Matthew',
        language: 'en-US',
        speechRate: 'medium'
      }, `Hey! This is the ElevenLabs voice test. Currently using Twilio's Matthew voice as a fallback. To hear the actual ElevenLabs ${voice.name} voice, please add your ELEVENLABS_API_KEY to the environment variables. How can I help you today?`);
    }

    // Start gathering input
    const gather = twiml.gather({
      input: ['speech'],
      action: `/api/voice/elevenlabs-test?voice=${voiceId}`,
      method: 'POST',
      speechTimeout: 'auto',
      timeout: 10,
      language: 'en-US',
      enhanced: true,
      speechModel: 'phone_call'
    });

    // Instructions
    twiml.say({
      voice: 'Polly.Matthew',
      language: 'en-US'
    }, 'Just start talking naturally to test the ElevenLabs voice!');

    return new Response(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' }
    });

  } catch (error) {
    console.error('ElevenLabs test greeting error:', error);
    
    const twiml = new VoiceResponse();
    twiml.say({
      voice: 'Polly.Matthew',
      language: 'en-US'
    }, 'Sorry, there was an issue starting the ElevenLabs test.');
    twiml.hangup();

    return new Response(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' }
    });
  }
}
