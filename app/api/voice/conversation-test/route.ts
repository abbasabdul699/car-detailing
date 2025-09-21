import { NextRequest } from 'next/server';
import twilio from 'twilio';

const VoiceResponse = twilio.twiml.VoiceResponse;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const transcription = formData.get('SpeechResult') as string;
    
    const twiml = new VoiceResponse();
    
    if (transcription) {
      // Generate a natural, conversational response
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
              content: `You're answering the phone for a car detailing business. You're having a casual conversation with a customer. Sound like a real person who's genuinely helpful and friendly.

IMPORTANT CONVERSATION STYLE:
- Talk like you're chatting with a friend, not giving a business presentation
- Use natural speech patterns: "Oh great!", "Sure thing!", "Perfect!", "No worries!"
- Ask follow-up questions naturally: "What kind of car do you have?", "When were you thinking?"
- Show enthusiasm: "Awesome!", "That sounds great!", "Perfect timing!"
- Use conversational fillers: "Um", "Let me see", "Actually", "Well"
- Respond to what they say: "Oh really?", "That's cool!", "Nice!"
- Be encouraging: "You got it!", "Absolutely!", "For sure!"

Don't sound like you're following a script. Just be a helpful, friendly person having a conversation.`
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
        
        // Generate OpenAI speech
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
            speed: 1.0
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
            speechRate: 'medium'
          }, aiResponse);
        }
      }
    } else {
      // Initial greeting
      const greetingResponse = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tts-1-hd',
          input: 'Hey! Thanks for calling. How can I help you today?',
          voice: 'nova',
          response_format: 'mp3',
          speed: 1.0
        })
      });

      if (greetingResponse.ok) {
        const audioBuffer = await greetingResponse.arrayBuffer();
        const base64Audio = Buffer.from(audioBuffer).toString('base64');
        const dataUri = `data:audio/mp3;base64,${base64Audio}`;
        twiml.play(dataUri);
      }
    }

    // Gather next input
    const gather = twiml.gather({
      input: ['speech'],
      action: '/api/voice/conversation-test',
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
    }, 'Thanks for calling! Have a great day!');
    twiml.hangup();

    return new Response(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' }
    });

  } catch (error) {
    console.error('Conversation test error:', error);
    
    const twiml = new VoiceResponse();
    twiml.say({
      voice: 'Polly.Matthew',
      language: 'en-US'
    }, 'Sorry, there was a technical issue. Please try calling back.');
    twiml.hangup();

    return new Response(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' }
    });
  }
}
