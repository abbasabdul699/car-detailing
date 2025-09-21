import { NextRequest } from 'next/server';
import twilio from 'twilio';

const VoiceResponse = twilio.twiml.VoiceResponse;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const transcription = formData.get('SpeechResult') as string;
    const confidence = parseFloat(formData.get('Confidence') as string || '0');
    
    const twiml = new VoiceResponse();
    
    if (transcription && confidence > 0.3) {
      console.log('Realtime test - User said:', transcription);
      
      // Simulate OpenAI Realtime API response
      // In a real implementation, this would be a WebSocket connection
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
              content: `You're having a real-time conversation with a customer calling a car detailing business. This is a test of the OpenAI Realtime API concept.

IMPORTANT: This is a REAL-TIME conversation test. Respond as if you're having an instant, natural conversation like ChatGPT Voice. Be very conversational, use natural speech patterns, and respond quickly and naturally.

- Use casual language: "Oh cool!", "Sure thing!", "Perfect!"
- Show enthusiasm: "Awesome!", "That's great!", "Nice!"
- Be conversational: "Um", "Well", "Actually", "You know"
- Respond naturally to what they say
- Keep responses short and natural for real-time conversation

This is testing real-time conversation flow, so sound like you're talking in real-time.`
            },
            { role: 'user', content: transcription }
          ],
          max_tokens: 80,
          temperature: 0.9
        })
      });

      if (response.ok) {
        const data = await response.json();
        const aiResponse = data.choices[0]?.message?.content || 'Sorry, what was that?';
        
        console.log('Realtime test - AI responding:', aiResponse);
        
        // Generate speech with nova voice (simulating Realtime API output)
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
            speed: 1.1 // Slightly faster for real-time feel
          })
        });

        if (speechResponse.ok) {
          const audioBuffer = await speechResponse.arrayBuffer();
          const base64Audio = Buffer.from(audioBuffer).toString('base64');
          const dataUri = `data:audio/mp3;base64,${base64Audio}`;
          twiml.play(dataUri);
        } else {
          // Fallback
          twiml.say({
            voice: 'Polly.Matthew',
            language: 'en-US',
            speechRate: 'fast'
          }, aiResponse);
        }
      }
    } else {
      // Low confidence or no speech - be more conversational
      const lowConfidenceResponse = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tts-1-hd',
          input: 'Sorry, what was that? I didn\'t catch it.',
          voice: 'nova',
          response_format: 'mp3',
          speed: 1.1
        })
      });

      if (lowConfidenceResponse.ok) {
        const audioBuffer = await lowConfidenceResponse.arrayBuffer();
        const base64Audio = Buffer.from(audioBuffer).toString('base64');
        const dataUri = `data:audio/mp3;base64,${base64Audio}`;
        twiml.play(dataUri);
      } else {
        twiml.say({
          voice: 'Polly.Matthew',
          language: 'en-US',
          speechRate: 'fast'
        }, 'Sorry, what was that? I didn\'t catch it.');
      }
    }

    // Continue the conversation
    const gather = twiml.gather({
      input: ['speech'],
      action: '/api/voice/realtime-test',
      method: 'POST',
      speechTimeout: 'auto',
      timeout: 10, // Back to normal timeout for better recognition
      language: 'en-US',
      enhanced: true,
      speechModel: 'phone_call'
    });

    // Fallback
    twiml.say({
      voice: 'Polly.Matthew',
      language: 'en-US'
    }, 'Thanks for testing the real-time conversation! Goodbye!');
    twiml.hangup();

    return new Response(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' }
    });

  } catch (error) {
    console.error('Realtime test error:', error);
    
    const twiml = new VoiceResponse();
    twiml.say({
      voice: 'Polly.Matthew',
      language: 'en-US'
    }, 'Sorry, there was a technical issue with the real-time test. Please try calling back.');
    twiml.hangup();

    return new Response(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' }
    });
  }
}

export async function GET(request: NextRequest) {
  try {
    const twiml = new VoiceResponse();
    
    // Initial greeting for real-time test
    const greetingResponse = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1-hd',
        input: 'Hey! Welcome to the real-time conversation test. I\'m ready to chat! What\'s up?',
        voice: 'nova',
        response_format: 'mp3',
        speed: 1.1
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
        speechRate: 'fast'
      }, 'Hey! Welcome to the real-time conversation test. I\'m ready to chat! What\'s up?');
    }

    // Start gathering input immediately
    const gather = twiml.gather({
      input: ['speech'],
      action: '/api/voice/realtime-test',
      method: 'POST',
      speechTimeout: 'auto',
      timeout: 8,
      language: 'en-US',
      enhanced: true,
      speechModel: 'phone_call'
    });

    // Fallback
    twiml.say({
      voice: 'Polly.Matthew',
      language: 'en-US'
    }, 'Thanks for testing! Goodbye!');
    twiml.hangup();

    return new Response(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' }
    });

  } catch (error) {
    console.error('Realtime test greeting error:', error);
    
    const twiml = new VoiceResponse();
    twiml.say({
      voice: 'Polly.Matthew',
      language: 'en-US'
    }, 'Sorry, there was an issue starting the real-time test.');
    twiml.hangup();

    return new Response(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' }
    });
  }
}
