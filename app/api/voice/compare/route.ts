import { NextRequest } from 'next/server';
import twilio from 'twilio';

const VoiceResponse = twilio.twiml.VoiceResponse;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const transcription = formData.get('SpeechResult') as string;
    const mode = formData.get('mode') as string || 'standard';
    
    const twiml = new VoiceResponse();
    
    if (transcription) {
      console.log(`Comparison test (${mode}) - User said:`, transcription);
      
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
              content: mode === 'realtime' 
                ? `You're having a REAL-TIME conversation test. Respond like ChatGPT Voice - very conversational, natural, and quick. Use casual language, show enthusiasm, and respond as if you're talking in real-time. Keep responses short and natural.`
                : `You're having a standard conversation. Respond professionally and helpfully, but this is the standard approach with slightly longer responses.`
            },
            { role: 'user', content: transcription }
          ],
          max_tokens: mode === 'realtime' ? 60 : 120,
          temperature: mode === 'realtime' ? 0.9 : 0.7
        })
      });

      if (response.ok) {
        const data = await response.json();
        const aiResponse = data.choices[0]?.message?.content || 'Sorry, what was that?';
        
        console.log(`Comparison test (${mode}) - AI responding:`, aiResponse);
        
        // Generate speech
        const speechResponse = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'tts-1-hd',
            input: aiResponse,
            voice: 'nova',
            response_format: 'mp3',
            speed: mode === 'realtime' ? 1.1 : 1.0
          })
        });

        if (speechResponse.ok) {
          const audioBuffer = await speechResponse.arrayBuffer();
          const base64Audio = Buffer.from(audioBuffer).toString('base64');
          const dataUri = `data:audio/mp3;base64,${base64Audio}`;
          twiml.play(dataUri);
        } else {
          twiml.say({
            voice: 'Polly.Matthew',
            language: 'en-US',
            speechRate: mode === 'realtime' ? 'fast' : 'medium'
          }, aiResponse);
        }
      }
    }

    // Continue conversation
    const gather = twiml.gather({
      input: ['speech'],
      action: `/api/voice/compare?mode=${mode}`,
      method: 'POST',
      speechTimeout: 'auto',
      timeout: mode === 'realtime' ? 8 : 10,
      language: 'en-US',
      enhanced: true,
      speechModel: 'phone_call'
    });

    // Mode switching option
    const switchMode = mode === 'realtime' ? 'standard' : 'realtime';
    const switchMessage = mode === 'realtime' 
      ? 'Say "switch" to test standard mode, or continue chatting in real-time mode.'
      : 'Say "switch" to test real-time mode, or continue chatting in standard mode.';
    
    twiml.say({
      voice: 'Polly.Matthew',
      language: 'en-US'
    }, switchMessage);

    return new Response(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' }
    });

  } catch (error) {
    console.error('Comparison test error:', error);
    
    const twiml = new VoiceResponse();
    twiml.say({
      voice: 'Polly.Matthew',
      language: 'en-US'
    }, 'Sorry, there was a technical issue with the comparison test.');
    twiml.hangup();

    return new Response(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' }
    });
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const mode = url.searchParams.get('mode') || 'standard';
    
    const twiml = new VoiceResponse();
    
    const greeting = mode === 'realtime'
      ? 'Hey! You\'re now in real-time mode. This simulates the OpenAI Realtime API experience. Chat naturally!'
      : 'Hello! You\'re now in standard mode. This is our current approach. How can I help you?';
    
    const greetingResponse = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1-hd',
        input: greeting,
        voice: 'nova',
        response_format: 'mp3',
        speed: mode === 'realtime' ? 1.1 : 1.0
      })
    });

    if (greetingResponse.ok) {
      const audioBuffer = await greetingResponse.arrayBuffer();
      const base64Audio = Buffer.from(audioBuffer).toString('base64');
      const dataUri = `data:audio/mp3;base64,${base64Audio}`;
      twiml.play(dataUri);
    } else {
      twiml.say({
        voice: 'Polly.Matthew',
        language: 'en-US',
        speechRate: mode === 'realtime' ? 'fast' : 'medium'
      }, greeting);
    }

    // Start gathering input
    const gather = twiml.gather({
      input: ['speech'],
      action: `/api/voice/compare?mode=${mode}`,
      method: 'POST',
      speechTimeout: 'auto',
      timeout: mode === 'realtime' ? 8 : 10,
      language: 'en-US',
      enhanced: true,
      speechModel: 'phone_call'
    });

    // Instructions
    const instructions = mode === 'realtime'
      ? 'Say "switch" to try standard mode, or just start chatting naturally!'
      : 'Say "switch" to try real-time mode, or ask me anything about car detailing!';
    
    twiml.say({
      voice: 'Polly.Matthew',
      language: 'en-US'
    }, instructions);

    return new Response(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' }
    });

  } catch (error) {
    console.error('Comparison test greeting error:', error);
    
    const twiml = new VoiceResponse();
    twiml.say({
      voice: 'Polly.Matthew',
      language: 'en-US'
    }, 'Sorry, there was an issue starting the comparison test.');
    twiml.hangup();

    return new Response(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' }
    });
  }
}
