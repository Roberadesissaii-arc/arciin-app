import { NextRequest, NextResponse } from 'next/server';

const RAPIDAPI_KEY = process.env.NEXT_PUBLIC_RAPIDAPI_KEY;
const RAPIDAPI_HOST = 'netflix54.p.rapidapi.com';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');
  const limitTitles = searchParams.get('limitTitles') || '6';

  if (!query) {
    return NextResponse.json({ error: 'Query parameter required' }, { status: 400 });
  }

  try {
    const params = new URLSearchParams({
      query,
      offset: '0',
      limit_titles: limitTitles,
      limit_suggestions: '10',
      lang: 'en'
    });

    const url = `https://${RAPIDAPI_HOST}/search/?${params}`;
    const response = await fetch(url, {
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY || '',
        'x-rapidapi-host': RAPIDAPI_HOST
      }
    });

    if (!response.ok) {
      return NextResponse.json({ 
        error: 'Netflix API error', 
        status: response.status 
      }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to search Netflix' }, { status: 500 });
  }
}
