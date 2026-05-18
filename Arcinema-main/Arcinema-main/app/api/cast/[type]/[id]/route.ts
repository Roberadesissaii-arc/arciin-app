import { NextRequest, NextResponse } from 'next/server';
import { getGloballyBlockedPersons } from '@/lib/firebase/contentFilter';
import { getAllBlockedContent } from '@/lib/firebase/blockedContent';

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_READ_ACCESS_TOKEN;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; type: string }> }
) {
  try {
    const { id, type } = await params;
    const contentId = parseInt(id);
    const mediaType = type; // 'movie' or 'tv'
    
    if (isNaN(contentId) || !['movie', 'tv'].includes(mediaType)) {
      return NextResponse.json(
        { error: 'Invalid parameters' },
        { status: 400 }
      );
    }

    // SECURITY: Check if the content itself is blocked - if so, return 404
    const blockedContent = await getAllBlockedContent();
    const contentKey = `${mediaType}_${contentId}`;
    if (blockedContent.has(contentKey)) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      );
    }

    // Fetch cast data from TMDB
    const endpoint = mediaType === 'movie' ? 'movie' : 'tv';
    const response = await fetch(
      `https://api.themoviedb.org/3/${endpoint}/${contentId}/credits`,
      {
        headers: {
          'Authorization': `Bearer ${TMDB_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch cast data' },
        { status: response.status }
      );
    }

    const creditsData = await response.json();
    
    // Get blocked persons and filter them out
    const blockedPersons = await getGloballyBlockedPersons();
    
    // Filter cast members (remove blocked persons completely)
    const filteredCast = (creditsData.cast || []).filter((person: any) => 
      !blockedPersons.has(person.id)
    );
    
    // Filter crew members (remove blocked persons completely)
    const filteredCrew = (creditsData.crew || []).filter((person: any) => 
      !blockedPersons.has(person.id)
    );

    return NextResponse.json({
      cast: filteredCast,
      crew: filteredCrew,
      id: creditsData.id
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}