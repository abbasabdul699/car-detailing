import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const placeId = searchParams.get('placeId');
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  console.log('[Google Reviews API] Received placeId:', placeId);
  if (!placeId) {
    return NextResponse.json({ error: 'Missing placeId parameter' }, { status: 400 });
  }
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing Google Maps API key' }, { status: 500 });
  }

  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=reviews,rating,user_ratings_total,name,geometry,formatted_address,photos&key=${apiKey}`;
  console.log('[Google Reviews API] Requesting URL:', url);

  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log('[Google Reviews API] Google response:', JSON.stringify(data, null, 2));
    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch from Google Places API' }, { status: 500 });
    }
    if (data.status !== 'OK') {
      return NextResponse.json({ error: data.error_message || 'Google Places API error', details: data }, { status: 500 });
    }
    return NextResponse.json({ reviews: data.result.reviews || [], rating: data.result.rating, user_ratings_total: data.result.user_ratings_total, name: data.result.name, address: data.result.formatted_address });
  } catch (error) {
    return NextResponse.json({ error: 'Server error', details: error instanceof Error ? error.message : error }, { status: 500 });
  }
} 