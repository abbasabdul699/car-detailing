import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('=== OPENAI TEST START ===');
    
    // Test OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful AI assistant.' },
          { role: 'user', content: 'Hello, test message' }
        ],
        max_tokens: 50,
        temperature: 0.7,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }
    
    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content || 'No response';
    
    console.log('OpenAI test result:', 'API working');
    
    return NextResponse.json({
      success: true,
      aiResponse,
      usage: data.usage
    });
    
  } catch (error) {
    console.error('=== OPENAI TEST ERROR ===');
    console.error('Error details:', error);
    
    return NextResponse.json({
      error: 'OpenAI test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
