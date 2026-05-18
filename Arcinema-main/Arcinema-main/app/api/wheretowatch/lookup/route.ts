import { NextRequest, NextResponse } from 'next/server';

const RAPIDAPI_KEY = process.env.NEXT_PUBLIC_RAPIDAPI_KEY;
const RAPIDAPI_HOST = 'where-can-i-watch1.p.rapidapi.com';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title');
  const country = searchParams.get('country') || 'us';
  const type = searchParams.get('type') || 'movie';

  if (!title) {
    return NextResponse.json({ error: 'Title parameter required' }, { status: 400 });
  }

  try {
    // Format title: remove spaces, lowercase, remove special characters
    const formattedTitle = title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '');
    
    const url = `https://${RAPIDAPI_HOST}/${country}/${type}/${formattedTitle}`;
    const response = await fetch(url, {
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY || '',
        'x-rapidapi-host': RAPIDAPI_HOST
      }
    });

    if (!response.ok) {
      return NextResponse.json({ 
        error: 'Where to watch API error', 
        status: response.status,
        title: title
      }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to lookup streaming info' }, { status: 500 });
  }
}
