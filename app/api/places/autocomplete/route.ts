import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const input = searchParams.get('input');
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!input) {
    return NextResponse.json({ error: 'Input parameter is required' }, { status: 400 });
  }

  if (!apiKey) {
    console.error('Google Maps API key is not configured');
    return NextResponse.json({ error: 'Service configuration error' }, { status: 500 });
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
      input
    )}&key=${apiKey}&types=(cities)`;

    console.log('Calling Google Places API...');
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'REQUEST_DENIED') {
      console.error('Google Places API request denied:', data.error_message);
      return NextResponse.json({ 
        error: 'API request denied', 
        details: data.error_message 
      }, { status: 403 });
    }

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google Places API error:', data.status, data.error_message);
      return NextResponse.json({ 
        error: 'API error', 
        status: data.status 
      }, { status: 500 });
    }

    return NextResponse.json({
      predictions: data.predictions || [],
      status: data.status
    });
  } catch (error) {
    console.error('Error fetching predictions:', error);
    return NextResponse.json({ error: 'Failed to fetch predictions' }, { status: 500 });
  }
} 