// lib/search/movieSearch.ts
import { getFilterConfig, filterSearchResults, isAdultContent, type ContentFilterLevel } from '@/lib/features/filters/contentFilter';

export interface Movie {
  id: number;
  title?: string;
  name?: string; // For TV shows
  poster_path: string;
  overview: string;
  vote_average: number;
  release_date?: string;
  first_air_date?: string; // For TV shows
  media_type: 'movie' | 'tv';
  genres?: { id: number; name: string }[];
}

export interface SearchOptions {
  contentFilter?: ContentFilterLevel;
  country?: string;
  includeAdult?: boolean;
}

// Function to search movies from TMDB
export const searchMovies = async (
  query: string, 
  options: SearchOptions = {}
): Promise<Movie[]> => {
  try {
    const token = process.env.NEXT_PUBLIC_TMDB_API_READ_ACCESS_TOKEN;
    const { contentFilter = 'filtered', country = 'all', includeAdult = false } = options;
    const filterConfig = getFilterConfig(contentFilter);
    const regionParam = country !== 'all' ? `&region=${country}` : '';
    
    const response = await fetch(
      `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(query)}&include_adult=${includeAdult || filterConfig.includeAdult}${regionParam}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    let filteredResults = (data?.results || [])
      .filter((movie: { poster_path: string }) => movie && movie.poster_path);
    
    if (contentFilter !== 'all') {
      filteredResults = filterSearchResults(filteredResults, contentFilter);
      filteredResults = filteredResults.filter((movie: any) => !isAdultContent(movie));
    }
    
    return filteredResults
      .slice(0, 8) // Increased from 4 to 8 for better results
      .map((movie: Record<string, unknown>) => ({
        ...movie,
        media_type: 'movie'
      })) as Movie[];
  } catch (error) {
    return [];
  }
};

// Function to search TV shows from TMDB
export const searchTVShows = async (
  query: string, 
  options: SearchOptions = {}
): Promise<Movie[]> => {
  try {
    const token = process.env.NEXT_PUBLIC_TMDB_API_READ_ACCESS_TOKEN;
    const { contentFilter = 'filtered', country = 'all', includeAdult = false } = options;
    const filterConfig = getFilterConfig(contentFilter);
    const regionParam = country !== 'all' ? `&region=${country}` : '';
    
    const response = await fetch(
      `https://api.themoviedb.org/3/search/tv?query=${encodeURIComponent(query)}&include_adult=${includeAdult || filterConfig.includeAdult}${regionParam}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    let filteredResults = (data?.results || [])
      .filter((show: { poster_path: string }) => show && show.poster_path);
    
    if (contentFilter !== 'all') {
      filteredResults = filterSearchResults(filteredResults, contentFilter);
      filteredResults = filteredResults.filter((show: any) => !isAdultContent(show));
    }
    
    return filteredResults
      .slice(0, 8) // Increased from 4 to 8 for better results
      .map((show: Record<string, unknown>) => ({
        ...show,
        media_type: 'tv'
      })) as Movie[];
  } catch (error) {
    return [];
  }
};

// Function to search both movies and TV shows
export const searchAll = async (
  query: string, 
  options: SearchOptions = {}
): Promise<Movie[]> => {
  try {
    const [movies, tvShows] = await Promise.all([
      searchMovies(query, options),
      searchTVShows(query, options)
    ]);
    
    // Combine and sort by popularity/vote_average
    const combined = [...movies, ...tvShows];
    return combined.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
  } catch (error) {
    return [];
  }
};

// Helper function to extract and fetch movies/TV shows from AI response text
export const extractAndFetchContent = async (
  text: string, 
  options: SearchOptions = {}
): Promise<Movie[]> => {
  const contentTitles = text.match(/"([^"]+)"/g)?.map(t => t.replace(/"/g, '')) || [];
  if (contentTitles.length === 0) return [];

  const searchPromises = contentTitles.map(async (title) => {
    try {
      const results = await searchAll(title, options);
      
      // Find the best match
      const exactMatch = results.find((item: any) => {
        const itemTitle = (item.title || item.name || '').toLowerCase();
        const searchTitle = title.toLowerCase();
        return itemTitle === searchTitle || itemTitle.includes(searchTitle);
      });
      
      return exactMatch || (results.length > 0 ? results[0] : null);
    } catch (error) {
      return null;
    }
  });

  const results = await Promise.all(searchPromises);
  return results.filter((item): item is Movie => item !== null);
};
