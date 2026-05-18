// lib/cineai/omdbApi.ts
// OMDB API integration for deep search fallback

import { Movie } from '@/types/ai-chat';

const OMDB_API_KEY = process.env.NEXT_PUBLIC_OMDB_API_KEY;

/**
 * Search movies using OMDB API (fallback when TMDB returns no results)
 */
export const searchMoviesOMDB = async (
  query: string,
  year?: number,
  type?: 'movie' | 'series'
): Promise<Movie[]> => {
  if (!OMDB_API_KEY) {
    return [];
  }

  try {
    let searchUrl = `http://www.omdbapi.com/?apikey=${OMDB_API_KEY}&s=${encodeURIComponent(query)}`;
    
    if (year) {
      searchUrl += `&y=${year}`;
    }
    
    if (type) {
      searchUrl += `&type=${type}`;
    }

    const response = await fetch(searchUrl);
    
    // Check for unauthorized (401) or other errors
    if (!response.ok) {
      if (response.status === 401) {
        // API key is invalid - silently fail and return empty array
        return [];
      }
      // Other errors - also return empty array
      return [];
    }
    
    const data = await response.json();

    // Check for API error responses
    if (data.Response === 'False' || !data.Search || data.Error) {
      return [];
    }

    // Fetch detailed info for each result (OMDB requires separate calls for details)
    const detailedMovies = await Promise.all(
      data.Search.slice(0, 8).map(async (item: any) => {
        try {
          const detailUrl = `http://www.omdbapi.com/?apikey=${OMDB_API_KEY}&i=${item.imdbID}&plot=full`;
          const detailResponse = await fetch(detailUrl);
          
          // Check for unauthorized (401) or other errors
          if (!detailResponse.ok) {
            return null;
          }
          
          const detailData = await detailResponse.json();

          if (detailData.Response === 'False' || detailData.Error) {
            return null;
          }

          // Convert OMDB format to our Movie format
          return {
            id: parseInt(detailData.imdbID.replace('tt', '')) || 0,
            title: detailData.Title,
            overview: detailData.Plot !== 'N/A' ? detailData.Plot : '',
            release_date: detailData.Released !== 'N/A' ? detailData.Released : '',
            vote_average: detailData.imdbRating !== 'N/A' ? parseFloat(detailData.imdbRating) : 0,
            poster_path: detailData.Poster !== 'N/A' ? detailData.Poster : null,
            backdrop_path: null,
            genre_ids: [],
            popularity: detailData.imdbRating !== 'N/A' ? parseFloat(detailData.imdbRating) * 10 : 0,
            media_type: 'movie' as const,
            // Store full poster URL from OMDB
            omdb_poster: detailData.Poster !== 'N/A' ? detailData.Poster : null,
            imdb_id: detailData.imdbID
          } as Movie;
        } catch (error) {
          return null;
        }
      })
    );

    return detailedMovies.filter((movie): movie is Movie => movie !== null);
  } catch (error) {
    return [];
  }
};

/**
 * Get movie details from OMDB by IMDb ID
 */
export const getMovieDetailsByIMDb = async (imdbId: string): Promise<Movie | null> => {
  if (!OMDB_API_KEY) {
    return null;
  }

  try {
    const detailUrl = `http://www.omdbapi.com/?apikey=${OMDB_API_KEY}&i=${imdbId}&plot=full`;
    const response = await fetch(detailUrl);
    
    // Check for unauthorized (401) or other errors
    if (!response.ok) {
      if (response.status === 401) {
        // API key is invalid - silently fail
        return null;
      }
      // Other errors - also return null
      return null;
    }
    
    const data = await response.json();

    if (data.Response === 'False' || data.Error) {
      return null;
    }

    return {
      id: parseInt(data.imdbID.replace('tt', '')) || 0,
      title: data.Title,
      overview: data.Plot !== 'N/A' ? data.Plot : '',
      release_date: data.Released !== 'N/A' ? data.Released : '',
      vote_average: data.imdbRating !== 'N/A' ? parseFloat(data.imdbRating) : 0,
      poster_path: data.Poster !== 'N/A' ? data.Poster : null,
      media_type: 'movie' as const,
      omdb_poster: data.Poster !== 'N/A' ? data.Poster : null,
      imdb_id: data.imdbID
    } as Movie;
  } catch (error) {
    return null;
  }
};
