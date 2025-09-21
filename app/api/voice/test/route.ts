import { NextRequest, NextResponse } from 'next/server';
import twilio from 'twilio';

const VoiceResponse = twilio.twiml.VoiceResponse;

export async function GET(request: NextRequest) {
  try {
    // Create a simple test TwiML response
    const twiml = new VoiceResponse();
    
    twiml.say({
      voice: 'Polly.Joanna',
      language: 'en-US',
      speechRate: 'medium'
    }, 'Hello! This is a test of the AI voice system. The system is working correctly.');

    twiml.hangup();

    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error) {
    console.error('Voice test error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Voice test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, detailerId } = body;

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Test AI voice response generation
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: 'You are a helpful AI voice assistant for a car detailing service. Respond as if you are speaking to a customer on the phone. Be conversational and friendly.' 
          },
          { role: 'user', content: message }
        ],
        max_tokens: 150,
        temperature: 0.8,
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`OpenAI API error: ${aiResponse.status}`);
    }

    const data = await aiResponse.json();
    const response = data.choices[0]?.message?.content || 'No response generated';

    // Create TwiML with the AI response
    const twiml = new VoiceResponse();
    
    twiml.say({
      voice: 'Polly.Joanna',
      language: 'en-US',
      speechRate: 'medium'
    }, response);

    twiml.hangup();

    return new NextResponse(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    });

  } catch (error) {
    console.error('Voice AI test error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Voice AI test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
