import { NextRequest, NextResponse } from 'next/server';
import { isPersonBlocked } from '@/lib/firebase/userBlockedContent';
import { getAllBlockedContent } from '@/lib/firebase/blockedContent';

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_READ_ACCESS_TOKEN;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const personId = parseInt(id);
    
    if (isNaN(personId)) {
      return NextResponse.json(
        { error: 'Invalid person ID' },
        { status: 400 }
      );
    }

    // ADMIN-ONLY SECURITY CHECK
    const userEmail = request.headers.get('x-user-email');
    const isAdminUser = userEmail === 'admin@arcinema.com';
    
    if (!isAdminUser) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    // Check if person is blocked
    const isBlocked = await isPersonBlocked(personId);

    // Fetch person details from TMDB (admin can view blocked persons)
    const [personResponse, creditsResponse, tvCreditsResponse] = await Promise.all([
      fetch(`https://api.themoviedb.org/3/person/${personId}?language=en-US`, {
        headers: {
          'Authorization': `Bearer ${TMDB_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }),
      fetch(`https://api.themoviedb.org/3/person/${personId}/movie_credits?language=en-US`, {
        headers: {
          'Authorization': `Bearer ${TMDB_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }),
      fetch(`https://api.themoviedb.org/3/person/${personId}/tv_credits?language=en-US`, {
        headers: {
          'Authorization': `Bearer ${TMDB_API_KEY}`,
          'Content-Type': 'application/json',
        },
      })
    ]);

    if (!personResponse.ok) {
      return NextResponse.json(
        { error: 'Person not found' },
        { status: 404 }
      );
    }

    const personData = await personResponse.json();
    const creditsData = creditsResponse.ok ? await creditsResponse.json() : { cast: [] };
    const tvCreditsData = tvCreditsResponse.ok ? await tvCreditsResponse.json() : { cast: [] };

    // Process movie credits - return all movies with posters, sorted by popularity and rating
    const movieCredits = creditsData.cast
      ?.filter((movie: any) => movie.poster_path)
      ?.sort((a: any, b: any) => {
        // Primary sort by popularity (higher is better)
        const popularityDiff = (b.popularity || 0) - (a.popularity || 0);
        if (popularityDiff !== 0) return popularityDiff;
        
        // Secondary sort by vote average (higher is better)
        return (b.vote_average || 0) - (a.vote_average || 0);
      }) || [];

    // Process TV credits with deduplication
    const uniqueShows = new Map();
    tvCreditsData.cast?.forEach((show: any) => {
      if (show.poster_path && (!uniqueShows.has(show.id) || show.vote_average > uniqueShows.get(show.id).vote_average)) {
        uniqueShows.set(show.id, show);
      }
    });
    
    const tvCredits = Array.from(uniqueShows.values())
      ?.sort((a: any, b: any) => {
        // Primary sort by popularity (higher is better)
        const popularityDiff = (b.popularity || 0) - (a.popularity || 0);
        if (popularityDiff !== 0) return popularityDiff;
        
        // Secondary sort by vote average (higher is better)
        return (b.vote_average || 0) - (a.vote_average || 0);
      }) || [];

    return NextResponse.json({
      person: personData,
      movieCredits,
      tvCredits,
      isBlocked,
      isAdminView: true
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}