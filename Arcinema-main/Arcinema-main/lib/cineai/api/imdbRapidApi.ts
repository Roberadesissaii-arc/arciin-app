// lib/cineai/imdbRapidApi.ts
// IMDb RapidAPI integration for advanced movie data

const RAPIDAPI_KEY = process.env.NEXT_PUBLIC_RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.NEXT_PUBLIC_RAPIDAPI_HOST || 'imdb236.p.rapidapi.com';

const fetchOptions = {
  headers: {
    'x-rapidapi-key': RAPIDAPI_KEY || '',
    'x-rapidapi-host': RAPIDAPI_HOST
  }
};

/**
 * Get cast member's filmography (all titles they've been in)
 */
export const getCastFilmography = async (castId: string): Promise<any[]> => {
  try {
    const url = `https://${RAPIDAPI_HOST}/api/imdb/cast/${castId}/titles`;
    const response = await fetch(url, fetchOptions);
    const data = await response.json();
    return data.titles || [];
  } catch (error) {
    return [];
  }
};

/**
 * Get movie poster from IMDb
 */
export const getImdbPoster = async (imdbId: string): Promise<string | null> => {
  try {
    const url = `https://${RAPIDAPI_HOST}/api/imdb/${imdbId}/poster`;
    const response = await fetch(url, fetchOptions);
    const data = await response.json();
    return data.poster || null;
  } catch (error) {
    return null;
  }
};

/**
 * Get TMDB ID from IMDb ID (for cross-referencing)
 */
export const getTmdbIdFromImdb = async (imdbId: string): Promise<string | null> => {
  try {
    const url = `https://${RAPIDAPI_HOST}/api/imdb/${imdbId}/tmdb-id`;
    const response = await fetch(url, fetchOptions);
    const data = await response.json();
    return data.tmdbId || null;
  } catch (error) {
    return null;
  }
};

/**
 * Advanced IMDb search with filters
 */
export const searchImdb = async (
  type: 'movie' | 'tv' | 'person' = 'movie',
  genre?: string,
  rows: number = 6
): Promise<any[]> => {
  try {
    const params = new URLSearchParams({
      type,
      rows: rows.toString(),
      sortOrder: 'DESC',
      sortField: 'rating'
    });
    
    if (genre) {
      params.append('genre', genre);
    }
    
    const url = `https://${RAPIDAPI_HOST}/api/imdb/search?${params}`;
    const response = await fetch(url, fetchOptions);
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    return [];
  }
};

/**
 * IMDb autocomplete for search suggestions
 */
export const imdbAutocomplete = async (query: string): Promise<any[]> => {
  try {
    const params = new URLSearchParams({ query });
    const url = `https://${RAPIDAPI_HOST}/api/imdb/autocomplete?${params}`;
    const response = await fetch(url, fetchOptions);
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    return [];
  }
};

/**
 * Get top box office movies
 */
export const getTopBoxOffice = async (): Promise<any[]> => {
  try {
    const url = `https://${RAPIDAPI_HOST}/api/imdb/top-box-office`;
    const response = await fetch(url, fetchOptions);
    const data = await response.json();
    return data.boxOffice || [];
  } catch (error) {
    return [];
  }
};

/**
 * Get top-rated Indian movies
 */
export const getTopIndianMovies = async (): Promise<any[]> => {
  try {
    const url = `https://${RAPIDAPI_HOST}/api/imdb/india/top-rated-indian-movies`;
    const response = await fetch(url, fetchOptions);
    const data = await response.json();
    return data.movies || [];
  } catch (error) {
    return [];
  }
};

/**
 * Get upcoming Indian movies
 */
export const getUpcomingIndianMovies = async (): Promise<any[]> => {
  try {
    const url = `https://${RAPIDAPI_HOST}/api/imdb/india/upcoming`;
    const response = await fetch(url, fetchOptions);
    const data = await response.json();
    return data.movies || [];
  } catch (error) {
    return [];
  }
};

/**
 * Get upcoming releases by country
 */
export const getUpcomingReleases = async (
  countryCode: string = 'US',
  type: 'MOVIE' | 'TV' = 'MOVIE'
): Promise<any[]> => {
  try {
    const params = new URLSearchParams({
      countryCode,
      type
    });
    const url = `https://${RAPIDAPI_HOST}/api/imdb/upcoming-releases?${params}`;
    const response = await fetch(url, fetchOptions);
    const data = await response.json();
    return data.releases || [];
  } catch (error) {
    return [];
  }
};
