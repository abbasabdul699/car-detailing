import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const hasApiKey = !!process.env.ELEVENLABS_API_KEY;
    const apiKeyLength = process.env.ELEVENLABS_API_KEY?.length || 0;
    const apiKeyPreview = hasApiKey ? 
      `${process.env.ELEVENLABS_API_KEY?.substring(0, 8)}...` : 
      'Not set';

    console.log('ElevenLabs API Key Status:', {
      hasApiKey,
      apiKeyLength,
      apiKeyPreview
    });

    // Test ElevenLabs API if key is available
    let apiTest = 'Not tested';
    if (hasApiKey) {
      try {
        const response = await fetch('https://api.elevenlabs.io/v1/voices', {
          headers: {
            'xi-api-key': process.env.ELEVENLABS_API_KEY!
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          apiTest = `Success - ${data.voices?.length || 0} voices available`;
        } else {
          const errorText = await response.text();
          apiTest = `Error: ${response.status} - ${errorText}`;
        }
      } catch (error) {
        apiTest = `Error: ${error}`;
      }
    }

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      elevenlabs: {
        apiKeyPresent: hasApiKey,
        apiKeyLength,
        apiKeyPreview,
        apiTest
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV
      }
    });

  } catch (error) {
    console.error('Test endpoint error:', error);
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
