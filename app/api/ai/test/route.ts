import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Test OpenAI API connection
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
    });

    const models = await response.json();
    
    return NextResponse.json({
      success: true,
      message: 'AI system is working!',
      openaiConnected: response.ok,
      availableModels: models.data?.slice(0, 3).map((model: any) => model.id) || [],
      environment: {
        hasOpenAIKey: !!process.env.OPENAI_API_KEY,
        hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
        hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
        hasTwilioSid: !!process.env.TWILIO_ACCOUNT_SID,
        hasTwilioToken: !!process.env.TWILIO_AUTH_TOKEN,
      }
    });
  } catch (error) {
    console.error('AI test error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'AI system test failed',
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

    // Simple AI response test
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
            content: 'You are a helpful AI assistant for a car detailing service. Be friendly and professional.' 
          },
          { role: 'user', content: message }
        ],
        max_tokens: 150,
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`OpenAI API error: ${aiResponse.status}`);
    }

    const data = await aiResponse.json();
    const response = data.choices[0]?.message?.content || 'No response generated';

    return NextResponse.json({
      success: true,
      userMessage: message,
      aiResponse: response,
      model: data.model,
      usage: data.usage
    });

  } catch (error) {
    console.error('AI test POST error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'AI response test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
