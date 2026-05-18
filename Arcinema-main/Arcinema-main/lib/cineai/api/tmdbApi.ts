// lib/cineai/tmdbApi.ts
// TMDB API functions for MovieVerse AI Chat

import { Movie, TVShow, MediaItem, UserPreferences } from '@/types/ai-chat';
import { filterSearchResults, isAdultContent } from '@/lib/features/filters/contentFilter';
import { getThemeSearchTerms, isSupplementaryContent } from '../utils/cineai-utils';
import { getAllBlockedContent } from '@/lib/firebase/blockedContent';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { projectFirestore } from '@/firebase/config';

const TMDB_TOKEN = process.env.NEXT_PUBLIC_TMDB_API_READ_ACCESS_TOKEN;

/**
 * Helper function to filter movies by language based on region preference and language setting
 * Only filters if region is NOT 'all' or language is specified
 */
const filterByLanguage = (movies: any[], region?: string, language?: string): any[] => {
  // If both region and language are 'all' or undefined, don't filter
  if ((!region || region === 'all') && (!language || language === 'all' || language.toLowerCase() === 'all languages')) {
    return movies;
  }
  
  let allowedLanguages: string[] = [];
  
  // If specific language is set, use that
  if (language && language !== 'all' && language.toLowerCase() !== 'all languages') {
    // Map common language names to ISO codes
    const languageMap: { [key: string]: string[] } = {
      'english': ['en'],
      'spanish': ['es'],
      'french': ['fr'],
      'german': ['de'],
      'italian': ['it'],
      'japanese': ['ja'],
      'korean': ['ko'],
      'chinese': ['zh'],
      'hindi': ['hi'],
      'portuguese': ['pt'],
      'russian': ['ru'],
      'arabic': ['ar'],
    };
    
    const langLower = language.toLowerCase();
    allowedLanguages = languageMap[langLower] || [langLower.substring(0, 2)]; // Try first 2 chars as ISO code
  } else if (region && region !== 'all') {
    // Map regions to primary language codes
    const regionLanguageMap: { [key: string]: string[] } = {
      'US': ['en'], // United States - English only
      'GB': ['en'], // United Kingdom - English only
      'CA': ['en', 'fr'], // Canada - English and French
      'AU': ['en'], // Australia - English only
      'NZ': ['en'], // New Zealand - English only
      'IE': ['en'], // Ireland - English only
      'IN': ['en', 'hi', 'ta', 'te'], // India - English + major Indian languages
      'PH': ['en', 'tl'], // Philippines - English and Tagalog
      'SG': ['en', 'zh', 'ms', 'ta'], // Singapore - multiple languages
    };
    
    allowedLanguages = regionLanguageMap[region] || ['en']; // Default to English
  }
  
  // If no language filter should be applied, return all
  if (allowedLanguages.length === 0) {
    return movies;
  }
  
  return movies.filter((movie: any) => {
    const originalLanguage = movie.original_language?.toLowerCase();
    
    // Always include if no language specified
    if (!originalLanguage) return true;
    
    // Check if movie's language is in allowed languages
    return allowedLanguages.includes(originalLanguage);
  });
};

/**
 * Helper function to remove duplicate titles (keeps only first occurrence)
 * When multiple results have the same or very similar title, keep only the FIRST one
 * This ensures we get the English/primary version and skip foreign duplicates
 */
const removeDuplicateTitles = (items: any[]): any[] => {
  const seenIds = new Set<number>();
  const uniqueItems: any[] = [];
  
  for (const item of items) {
    // Only check for exact duplicate IDs, not similar titles
    // This way "Spider-Man", "Spider-Man 2", "The Amazing Spider-Man" all show up
    if (!seenIds.has(item.id)) {
      seenIds.add(item.id);
      uniqueItems.push(item);
    }
  }
  
  return uniqueItems;
};

/**
 * Helper function to filter out blocked content from TMDB results
 */
const filterBlockedItems = async (items: any[], mediaType: 'movie' | 'tv' | 'anime'): Promise<any[]> => {
  const blockedMap = await getAllBlockedContent();
  
  return items.filter(item => {
    const key = `${mediaType}_${item.id}`;
    const isBlocked = blockedMap.has(key);
    
    if (isBlocked) {

    }
    
    return !isBlocked;
  });
};

/**
 * Search movies by query with optional filters
 */
export const searchMoviesByQuery = async (
  query: string,
  year?: number,
  genre?: string,
  includeAdult: boolean = false,
  region?: string,
  language?: string
): Promise<Movie[]> => {
  try {
    // Build search URL with optional year filter and region
    let searchUrl = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(query)}&include_adult=${includeAdult}`;
    if (year) {
      searchUrl += `&year=${year}`;
    }
    if (region && region !== 'all') {
      searchUrl += `&region=${region}`;
    }

    const response = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${TMDB_TOKEN}` },
    });
    
    const data = await response.json();
    let results = data.results || [];
    
    // Apply content filtering
    if (!includeAdult) {
      results = filterSearchResults(results, 'filtered');
      results = results.filter((movie: any) => !isAdultContent(movie));
    }
    
    // For popular franchise searches, filter by popularity
    const popularFranchises = [
      'iron man', 'spider-man', 'spiderman', 'avengers', 'batman', 'superman', 
      'captain america', 'thor', 'black panther', 'star wars', 'harry potter',
      'fast and furious', 'mission impossible', 'james bond', 'marvel', 'dc'
    ];
    const queryLowerForCheck = query.toLowerCase().trim();
    const isPopularFranchise = popularFranchises.some(franchise => queryLowerForCheck.includes(franchise));
    
    if (isPopularFranchise) {
      results = results.filter((movie: any) => movie.popularity && movie.popularity > 15);
    }
    
    // Filter by genre if specified
    if (genre) {
      const genreResponse = await fetch(`https://api.themoviedb.org/3/genre/movie/list`, {
        headers: { Authorization: `Bearer ${TMDB_TOKEN}` }
      });
      const genreData = await genreResponse.json();
      const genreObj = genreData.genres.find((g: any) => 
        g.name.toLowerCase().includes(genre.toLowerCase())
      );
      
      if (genreObj) {
        results = results.filter((movie: any) => 
          movie.genre_ids && movie.genre_ids.includes(genreObj.id)
        );
      }
    }
    
    // Better exact match logic
    const queryLower = query.toLowerCase().trim();
    let exactMatch = results.find((movie: any) => 
      movie.title && movie.title.toLowerCase() === queryLower
    );
    
    if (exactMatch && exactMatch.poster_path && !isSupplementaryContent(exactMatch)) {
      results = [exactMatch, ...results.filter((m: any) => m.id !== exactMatch.id)];
    } else {
      results = results.filter((movie: any) => !isSupplementaryContent(movie));
      results.sort((a: any, b: any) => {
        const aExact = a.title && a.title.toLowerCase() === queryLower;
        const bExact = b.title && b.title.toLowerCase() === queryLower;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        return b.popularity - a.popularity;
      });
    }
    
    // Filter by language based on region preference and language setting
    results = filterByLanguage(results, region, language);
    
    // Remove duplicate titles (keeps first occurrence - usually English version)
    results = removeDuplicateTitles(results);
    
    // Filter out blocked content
    results = await filterBlockedItems(results, 'movie');
    
    return results
      .filter((movie: any) => movie.poster_path)
      .slice(0, 6)
      .map((movie: any) => ({ ...movie, media_type: 'movie' }));
  } catch (error) {
    return [];
  }
};

/**
 * Search movies by theme (horror, romance, etc.)
 */
export const searchMoviesByTheme = async (
  themeQuery: string,
  year?: number,
  includeAdult: boolean = false,
  region?: string,
  sortBy: string = 'popularity.desc', // Default to popularity
  trendingMode: boolean = false, // NEW: whether to filter for recent/trending content
  language?: string
): Promise<Movie[]> => {
  try {
    // Safety check for undefined themeQuery
    if (!themeQuery || typeof themeQuery !== 'string') {
      return [];
    }
    
    // Map common genre names to TMDB genre IDs
    const genreMapping: { [key: string]: number } = {
      'action': 28,
      'adventure': 12,
      'animation': 16,
      'comedy': 35,
      'crime': 80,
      'documentary': 99,
      'drama': 18,
      'family': 10751,
      'fantasy': 14,
      'history': 36,
      'horror': 27,
      'music': 10402,
      'mystery': 9648,
      'romance': 10749,
      'romantic': 10749, // Map "romantic" to romance genre
      'science fiction': 878,
      'sci-fi': 878,
      'scifi': 878,
      'thriller': 53,
      'war': 10752,
      'western': 37
    };
    
    const themeLower = themeQuery.toLowerCase().trim();
    
    // Check for combined genres (e.g., "sci-fi thriller", "action comedy", "romantic drama")
    // First check for multi-word genre phrases
    let matchedGenres: number[] = [];
    
    // Check for "romantic drama" or "romance drama" as a combined phrase
    if (themeLower.includes('romantic') || themeLower.includes('romance')) {
      matchedGenres.push(10749); // Romance genre
    }
    
    // Split into words and check each word
    const genreWords = themeLower.split(/[\s-]+/);
    for (const word of genreWords) {
      const genreId = genreMapping[word];
      if (genreId && !matchedGenres.includes(genreId)) {
        matchedGenres.push(genreId);
      }
    }
    
    // If we found genre matches, use discover API
    if (matchedGenres.length > 0) {
      // Use discover API with genre IDs for accurate results
      let discoverUrl = `https://api.themoviedb.org/3/discover/movie?include_adult=${includeAdult}&sort_by=${sortBy}&with_genres=${matchedGenres.join(',')}`;
      
      // For trending mode, filter to recent releases only (last 2 years)
      if (trendingMode) {
        const currentYear = new Date().getFullYear();
        const twoYearsAgo = currentYear - 2;
        discoverUrl += `&primary_release_date.gte=${twoYearsAgo}-01-01`; // Last 2 years
        discoverUrl += `&vote_count.gte=50`; // Minimum 50 votes for credibility
      }
      
      if (year) {
        discoverUrl += `&primary_release_year=${year}`;
      }
      
      const response = await fetch(discoverUrl, {
        headers: { Authorization: `Bearer ${TMDB_TOKEN}` },
      });
      
      const data = await response.json();
      let results = data.results || [];
      
      // STRICT GENRE FILTERING: Ensure results actually have the requested genres
      // This is critical for queries like "romantic drama" to avoid returning action/horror movies
      if (matchedGenres.length > 0 && results.length > 0) {
        // Get full genre list to verify genre_ids
        try {
          const genreResponse = await fetch(`https://api.themoviedb.org/3/genre/movie/list`, {
            headers: { Authorization: `Bearer ${TMDB_TOKEN}` }
          });
          const genreData = await genreResponse.json();
          const genreMap = new Map(genreData.genres.map((g: any) => [g.id, g.name.toLowerCase()]));
          
          // Filter results to ensure they have at least one of the requested genres
          // For "romantic drama", ensure the movie has romance genre (10749)
          const hasRomanceQuery = themeLower.includes('romantic') || themeLower.includes('romance');
          const romanceGenreId = 10749;
          
          results = results.filter((movie: any) => {
            if (!movie.genre_ids || movie.genre_ids.length === 0) {
              return false; // Skip movies without genre info
            }
            
            // If user asked for romance/romantic, ensure movie has romance genre
            if (hasRomanceQuery && !movie.genre_ids.includes(romanceGenreId)) {
              return false; // Exclude non-romance movies
            }
            
            // Ensure movie has at least one of the matched genres
            const hasRequestedGenre = movie.genre_ids.some((id: number) => matchedGenres.includes(id));
            return hasRequestedGenre;
          });
        } catch (error) {
          // If genre fetch fails, continue without strict filtering
          console.warn('Failed to fetch genre list for strict filtering:', error);
        }
      }
      
      // Apply content filtering
      if (!includeAdult) {
        results = filterSearchResults(results, 'filtered');
        results = results.filter((movie: any) => !isAdultContent(movie));
      }
      
      // Filter by language based on region preference and language setting
      results = filterByLanguage(results, region, language);
      
      // Remove duplicate titles
      results = removeDuplicateTitles(results);
      
      // Filter out blocked content
      results = await filterBlockedItems(results, 'movie');
      
      return results
        .filter((movie: any) => movie.poster_path)
        .slice(0, 6)
        .map((movie: any) => ({ ...movie, media_type: 'movie' }));
    }
    
    // Fallback to keyword search for non-genre queries (themes like "time travel", "superhero", etc.)
    const searchTerms = getThemeSearchTerms(themeQuery);
    const allResults: Movie[] = [];
    
    for (const term of searchTerms.slice(0, 3)) {
      try {
        const results = await searchMoviesByQuery(term, year, undefined, includeAdult, region);
        allResults.push(...results);
      } catch (error) {
        // Continue with other terms
      }
    }
    
    // Remove duplicates
    const uniqueResults = allResults.filter((movie, index, self) =>
      index === self.findIndex((m) => m.id === movie.id)
    );
    
    return uniqueResults
      .sort((a, b) => b.vote_average - a.vote_average)
      .slice(0, 6);
  } catch (error) {
    return [];
  }
};

/**
 * Get detailed movie information
 */
export const getMovieDetails = async (
  movieTitle: string,
  includeAdult: boolean = false,
  region?: string
): Promise<Movie | null> => {
  try {
    const searchResults = await searchMoviesByQuery(movieTitle, undefined, undefined, includeAdult, region);
    if (searchResults.length === 0) return null;
    
    const movie = searchResults[0];
    const response = await fetch(`https://api.themoviedb.org/3/movie/${movie.id}?language=en-US`, {
      headers: { Authorization: `Bearer ${TMDB_TOKEN}` },
    });
    
    const detailedMovie = await response.json();
    
    return {
      ...movie,
      overview: detailedMovie.overview,
      runtime: detailedMovie.runtime,
      genres: detailedMovie.genres,
      production_companies: detailedMovie.production_companies,
      production_countries: detailedMovie.production_countries,
      release_date: detailedMovie.release_date,
      budget: detailedMovie.budget,
      revenue: detailedMovie.revenue,
      tagline: detailedMovie.tagline
    };
  } catch (error) {
    return null;
  }
};

/**
 * Discover movies by year
 */
export const discoverMoviesByYear = async (
  year: number,
  genre?: string,
  includeAdult: boolean = false,
  region?: string,
  language?: string
): Promise<Movie[]> => {
  try {
    let discoverUrl = `https://api.themoviedb.org/3/discover/movie?primary_release_year=${year}&include_adult=${includeAdult}&sort_by=popularity.desc`;
    
    if (genre) {
      const genreResponse = await fetch(`https://api.themoviedb.org/3/genre/movie/list`, {
        headers: { Authorization: `Bearer ${TMDB_TOKEN}` }
      });
      const genreData = await genreResponse.json();
      
      // Map common genre names to TMDB genre names for better matching
      const genreNameMapping: { [key: string]: string } = {
        'sci-fi': 'Science Fiction',
        'scifi': 'Science Fiction',
        'science fiction': 'Science Fiction',
        'romance': 'Romance',
        'action': 'Action',
        'horror': 'Horror',
        'comedy': 'Comedy',
        'drama': 'Drama',
        'thriller': 'Thriller',
        'fantasy': 'Fantasy',
        'adventure': 'Adventure'
      };
      
      const normalizedGenre = genreNameMapping[genre.toLowerCase()] || genre;
      const genreObj = genreData.genres.find((g: any) => 
        g.name.toLowerCase() === normalizedGenre.toLowerCase() ||
        g.name.toLowerCase().includes(normalizedGenre.toLowerCase()) ||
        normalizedGenre.toLowerCase().includes(g.name.toLowerCase())
      );
      
      if (genreObj) {
        discoverUrl += `&with_genres=${genreObj.id}`;
      }
    }

    const response = await fetch(discoverUrl, {
      headers: { Authorization: `Bearer ${TMDB_TOKEN}` },
    });
    
    const data = await response.json();
    let results = data.results || [];
    
    if (!includeAdult) {
      results = filterSearchResults(results, 'filtered');
      results = results.filter((movie: any) => !isAdultContent(movie));
    }
    
    // Filter by language based on region preference and language setting
    results = filterByLanguage(results, region, language);
    
    // Remove duplicate titles (keeps first occurrence - usually English version)
    results = removeDuplicateTitles(results);
    
    // Filter out blocked content
    results = await filterBlockedItems(results, 'movie');
    
    // Return more results for "top" queries (up to 20) to give better selection
    return results
      .filter((movie: any) => movie.poster_path)
      .slice(0, 20) // Increased from 6 to 20 for better "top" results
      .map((movie: any) => ({ ...movie, media_type: 'movie' }));
  } catch (error) {
    return [];
  }
};

/**
 * Get trending movies
 */
export const getTrendingMovies = async (
  timeWindow: 'day' | 'week' = 'week',
  includeAdult: boolean = false,
  region?: string,
  language?: string
): Promise<Movie[]> => {
  try {
    const response = await fetch(`https://api.themoviedb.org/3/trending/movie/${timeWindow}`, {
      headers: { Authorization: `Bearer ${TMDB_TOKEN}` },
    });
    
    const data = await response.json();
    let results = data.results || [];
    
    if (!includeAdult) {
      results = filterSearchResults(results, 'filtered');
      results = results.filter((movie: any) => !isAdultContent(movie));
    }
    
    // Filter by language based on region preference and language setting
    results = filterByLanguage(results, region, language);
    
    // Remove duplicate titles (keeps first occurrence - usually English version)
    results = removeDuplicateTitles(results);
    
    // Filter out blocked content
    results = await filterBlockedItems(results, 'movie');
    
    return results
      .filter((movie: any) => movie.poster_path)
      .slice(0, 6)
      .map((movie: any) => ({ ...movie, media_type: 'movie' }));
  } catch (error) {
    return [];
  }
};

/**
 * Get popular movies
 */
export const getPopularMovies = async (
  includeAdult: boolean = false,
  region?: string,
  language?: string
): Promise<Movie[]> => {
  try {
    const response = await fetch(`https://api.themoviedb.org/3/movie/popular?include_adult=${includeAdult}`, {
      headers: { Authorization: `Bearer ${TMDB_TOKEN}` },
    });
    
    const data = await response.json();
    let results = data.results || [];
    
    if (!includeAdult) {
      results = filterSearchResults(results, 'filtered');
      results = results.filter((movie: any) => !isAdultContent(movie));
    }
    
    // Filter by language based on region preference and language setting
    results = filterByLanguage(results, region, language);
    
    // Remove duplicate titles (keeps first occurrence - usually English version)
    results = removeDuplicateTitles(results);
    
    // Filter out blocked content
    results = await filterBlockedItems(results, 'movie');
    
    return results
      .filter((movie: any) => movie.poster_path)
      .slice(0, 6)
      .map((movie: any) => ({ ...movie, media_type: 'movie' }));
  } catch (error) {
    return [];
  }
};

/**
 * Get movie videos (trailers)
 */
export const getMovieVideos = async (movieId: number): Promise<any[]> => {
  try {
    const response = await fetch(`https://api.themoviedb.org/3/movie/${movieId}/videos?language=en-US`, {
      headers: { Authorization: `Bearer ${TMDB_TOKEN}` },
    });
    
    const data = await response.json();
    const videos = data.results || [];
    const trailers = videos.filter((video: any) => 
      video.site === 'YouTube' && 
      (video.type === 'Trailer' || video.type === 'Teaser')
    );
    
    trailers.sort((a: any, b: any) => {
      if (a.official && !b.official) return -1;
      if (!a.official && b.official) return 1;
      if (a.type === 'Trailer' && b.type === 'Teaser') return -1;
      if (a.type === 'Teaser' && b.type === 'Trailer') return 1;
      return 0;
    });
    
    return trailers.slice(0, 3);
  } catch (error) {
    return [];
  }
};

/**
 * Get movie credits (cast & crew)
 */
export const getMovieCredits = async (movieId: number): Promise<any> => {
  try {
    const response = await fetch(`https://api.themoviedb.org/3/movie/${movieId}/credits?language=en-US`, {
      headers: { Authorization: `Bearer ${TMDB_TOKEN}` },
    });
    
    const data = await response.json();
    
    return {
      cast: data.cast?.slice(0, 10) || [],
      crew: data.crew?.filter((person: any) => 
        person.job === 'Director' || person.job === 'Producer' || person.job === 'Writer'
      ) || []
    };
  } catch (error) {
    return { cast: [], crew: [] };
  }
};

/**
 * Search TV shows by query
 */
export const searchTVShowsByQuery = async (
  query: string,
  year?: number,
  includeAdult: boolean = false,
  region?: string
): Promise<TVShow[]> => {
  try {
    let searchUrl = `https://api.themoviedb.org/3/search/tv?query=${encodeURIComponent(query)}&include_adult=${includeAdult}`;
    if (year) {
      searchUrl += `&first_air_date_year=${year}`;
    }

    const response = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${TMDB_TOKEN}` },
    });
    
    const data = await response.json();
    let results = data.results || [];
    
    if (!includeAdult) {
      results = filterSearchResults(results, 'filtered');
      results = results.filter((show: any) => !isAdultContent(show));
    }
    
    // Region filtering for TV shows
    if (region && region !== 'all') {
      results = results.filter((show: any) => {
        if (show.origin_country && show.origin_country.length > 0) {
          return show.origin_country.includes(region);
        }
        const langMap: Record<string, string> = {
          'US': 'en', 'KR': 'ko', 'JP': 'ja', 'FR': 'fr', 'DE': 'de',
          'ES': 'es', 'IT': 'it', 'IN': 'hi', 'CN': 'zh', 'RU': 'ru', 'BR': 'pt'
        };
        return show.original_language === langMap[region] || true;
      });
    }
    
    // Remove duplicate titles (keeps first occurrence - usually English version)
    results = removeDuplicateTitles(results);
    
    // Filter out blocked content
    results = await filterBlockedItems(results, 'tv');
    
    return results
      .filter((show: any) => show.poster_path)
      .slice(0, 6)
      .map((show: any) => ({ ...show, media_type: 'tv' }));
  } catch (error) {
    return [];
  }
};

/**
 * Get TV show videos (trailers)
 */
export const getTVShowVideos = async (tvId: number): Promise<any[]> => {
  try {
    const response = await fetch(`https://api.themoviedb.org/3/tv/${tvId}/videos?language=en-US`, {
      headers: { Authorization: `Bearer ${TMDB_TOKEN}` },
    });
    
    const data = await response.json();
    const videos = data.results || [];
    const trailers = videos.filter((video: any) => 
      video.site === 'YouTube' && 
      (video.type === 'Trailer' || video.type === 'Teaser')
    );
    
    trailers.sort((a: any, b: any) => {
      if (a.official && !b.official) return -1;
      if (!a.official && b.official) return 1;
      if (a.type === 'Trailer' && b.type === 'Teaser') return -1;
      if (a.type === 'Teaser' && b.type === 'Trailer') return 1;
      return 0;
    });
    
    return trailers.slice(0, 3);
  } catch (error) {
    return [];
  }
};

/**
 * Get trending TV shows
 */
export const getTrendingTVShows = async (
  timeWindow: 'day' | 'week' = 'week',
  includeAdult: boolean = false
): Promise<TVShow[]> => {
  try {
    const response = await fetch(`https://api.themoviedb.org/3/trending/tv/${timeWindow}`, {
      headers: { Authorization: `Bearer ${TMDB_TOKEN}` },
    });
    
    const data = await response.json();
    let results = data.results || [];
    
    if (!includeAdult) {
      results = filterSearchResults(results, 'filtered');
      results = results.filter((show: any) => !isAdultContent(show));
    }
    
    // Remove duplicate titles (keeps first occurrence - usually English version)
    results = removeDuplicateTitles(results);
    
    // Filter out blocked content
    results = await filterBlockedItems(results, 'tv');
    
    return results
      .filter((show: any) => show.poster_path)
      .slice(0, 6)
      .map((show: any) => ({ ...show, media_type: 'tv' }));
  } catch (error) {
    return [];
  }
};

/**
 * Get TV show credits (cast & crew)
 */
export const getTVShowCredits = async (tvId: number): Promise<any> => {
  try {
    const response = await fetch(`https://api.themoviedb.org/3/tv/${tvId}/credits?language=en-US`, {
      headers: { Authorization: `Bearer ${TMDB_TOKEN}` },
    });
    
    const data = await response.json();
    
    return {
      cast: data.cast?.slice(0, 10) || [],
      crew: data.crew?.filter((person: any) => 
        person.job === 'Director' || person.job === 'Producer' || person.job === 'Writer' || person.job === 'Creator'
      ) || []
    };
  } catch (error) {
    return { cast: [], crew: [] };
  }
};

/**
 * Get detailed information about a TV show with seasons and episodes
 */
export const getTVShowDetails = async (
  tvShowTitle: string,
  includeAdult: boolean = false
): Promise<any | null> => {
  try {
    const searchResults = await searchTVShowsByQuery(tvShowTitle, undefined, includeAdult);
    if (searchResults.length === 0) return null;
    
    const tvShow = searchResults[0];
    const response = await fetch(`https://api.themoviedb.org/3/tv/${tvShow.id}?language=en-US`, {
      headers: { Authorization: `Bearer ${TMDB_TOKEN}` },
    });
    
    const detailedShow = await response.json();
    
    // Get credits (cast & crew)
    const creditsResponse = await fetch(`https://api.themoviedb.org/3/tv/${tvShow.id}/credits?language=en-US`, {
      headers: { Authorization: `Bearer ${TMDB_TOKEN}` },
    });
    const credits = await creditsResponse.json();
    
    return {
      ...tvShow,
      overview: detailedShow.overview || tvShow.overview,
      genres: detailedShow.genres || tvShow.genres,
      first_air_date: detailedShow.first_air_date || tvShow.first_air_date,
      last_air_date: detailedShow.last_air_date,
      number_of_seasons: detailedShow.number_of_seasons,
      number_of_episodes: detailedShow.number_of_episodes,
      status: detailedShow.status, // Returning Series, Ended, etc.
      seasons: detailedShow.seasons?.map((season: any) => ({
        season_number: season.season_number,
        name: season.name,
        episode_count: season.episode_count,
        air_date: season.air_date,
        overview: season.overview
      })) || [],
      cast: credits.cast?.slice(0, 10).map((person: any) => ({
        name: person.name,
        character: person.character,
        profile_path: person.profile_path
      })) || [],
      creators: detailedShow.created_by?.map((creator: any) => creator.name) || [],
      networks: detailedShow.networks?.map((network: any) => network.name) || []
    };
  } catch (error) {
    return null;
  }
};

/**
 * Search for a person (actor, director, etc.) by name
 */
export const searchPersonByName = async (
  personName: string,
  includeAdult: boolean = false
): Promise<any[]> => {
  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/search/person?query=${encodeURIComponent(personName)}&include_adult=${includeAdult}&language=en-US&page=1`,
      {
        headers: { Authorization: `Bearer ${TMDB_TOKEN}` },
      }
    );
    
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    return [];
  }
};

/**
 * Get detailed information about a person including biography
 */
export const getPersonDetails = async (
  personId: number
): Promise<any> => {
  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/person/${personId}?language=en-US`,
      {
        headers: { Authorization: `Bearer ${TMDB_TOKEN}` },
      }
    );
    
    const data = await response.json();
    return data;
  } catch (error) {
    return null;
  }
};

/**
 * Get all movies AND TV shows for a specific actor/person
 * Fetches from both /person/{id}/movie_credits and /person/{id}/tv_credits
 */
export const getMoviesByPerson = async (
  personId: number
): Promise<Movie[]> => {
  try {
    // Fetch BOTH movie credits AND TV credits
    const [movieResponse, tvResponse] = await Promise.all([
      fetch(
        `https://api.themoviedb.org/3/person/${personId}/movie_credits?language=en-US`,
        {
          headers: { Authorization: `Bearer ${TMDB_TOKEN}` },
        }
      ),
      fetch(
        `https://api.themoviedb.org/3/person/${personId}/tv_credits?language=en-US`,
        {
          headers: { Authorization: `Bearer ${TMDB_TOKEN}` },
        }
      )
    ]);
    
    const movieData = await movieResponse.json();
    const tvData = await tvResponse.json();
    
    // Get movie cast credits (movies they acted in)
    let movies = (movieData.cast || [])
      .filter((movie: any) => movie.poster_path) // Only movies with posters
      .map((movie: any) => ({
        id: movie.id,
        title: movie.title,
        poster_path: movie.poster_path,
        overview: movie.overview || '',
        vote_average: movie.vote_average || 0,
        release_date: movie.release_date || '',
        original_language: movie.original_language || 'en',
        popularity: movie.popularity || 0,
        media_type: 'movie' as const
      }));
    
    // Get TV show cast credits (TV shows they acted in)
    let tvShows = (tvData.cast || [])
      .filter((show: any) => show.poster_path) // Only shows with posters
      .map((show: any) => ({
        id: show.id,
        title: show.name || show.original_name, // TV shows use 'name' instead of 'title'
        poster_path: show.poster_path,
        overview: show.overview || '',
        vote_average: show.vote_average || 0,
        release_date: show.first_air_date || '', // TV shows use 'first_air_date'
        original_language: show.original_language || 'en',
        popularity: show.popularity || 0,
        media_type: 'tv' as const
      }));
    
    // Combine movies and TV shows
    let allContent = [...movies, ...tvShows];
    
    // Filter out supplementary content (reviews, documentaries about movies, etc.)
    allContent = allContent.filter((item: any) => {
      if (isSupplementaryContent(item)) return false;
      
      // Filter out content with review/documentary keywords in title (multiple languages)
      const titleLower = item.title.toLowerCase();
      const reviewKeywords = [
        'crítica', 'critica', 'review', 'documentary about', 'documental sobre',
        'the making of', 'behind the scenes', 'análisis', 'analisis',
        'resumen', 'summary', 'trailer', 'teaser', 'promo'
      ];
      
      if (reviewKeywords.some(keyword => titleLower.includes(keyword))) {
        return false;
      }
      
      return true;
    });
    
    // Remove duplicates by ID first
    allContent = removeDuplicateTitles(allContent);
    
    // Filter out content that is clearly about other content (reviews, documentaries, etc.)
    // Check for titles that contain another title but are clearly supplementary
    allContent = allContent.filter((item: any) => {
      const titleLower = item.title.toLowerCase();
      
      // Check if this title contains words that indicate it's about another content
      const aboutContentPatterns = [
        /crítica de/i,  // Spanish: "review of"
        /review of/i,
        /documental sobre/i,  // Spanish: "documentary about"
        /documentary about/i,
        /análisis de/i,  // Spanish: "analysis of"
        /analysis of/i,
        /resumen de/i,  // Spanish: "summary of"
        /summary of/i,
        /la crítica/i,  // Spanish: "the review"
        /el indefinido/i,  // Spanish: "the undefined" (common in review titles)
      ];
      
      // If title matches these patterns, it's likely a review/documentary about another content
      if (aboutContentPatterns.some(pattern => pattern.test(titleLower))) {
        return false;
      }
      
      return true;
    });
    
    // Filter out duplicate/similar titles (keep the one with higher popularity/vote_average)
    // This handles cases like duplicate entries or foreign-language reviews
    const titleMap = new Map<string, any>();
    for (const item of allContent) {
      const titleKey = item.title.toLowerCase().trim();
      const existing = titleMap.get(titleKey);
      
      if (!existing) {
        titleMap.set(titleKey, item);
      } else {
        // If we have a similar title, prefer:
        // 1. English original language
        // 2. Higher popularity
        // 3. Higher vote_average
        const preferExisting = 
          (existing.original_language === 'en' && item.original_language !== 'en') ||
          (existing.original_language === item.original_language && 
           (existing.popularity > item.popularity || 
            (existing.popularity === item.popularity && existing.vote_average > item.vote_average)));
        
        if (!preferExisting) {
          titleMap.set(titleKey, item);
        }
      }
    }
    
    allContent = Array.from(titleMap.values());
    
    // Sort by vote_average (highest first) for "best" queries, then by release date
    allContent.sort((a: Movie, b: Movie) => {
      // First sort by vote_average (best content first)
      if (b.vote_average !== a.vote_average) {
        return b.vote_average - a.vote_average;
      }
      // Then by popularity (if available)
      const popB = b.popularity || 0;
      const popA = a.popularity || 0;
      if (popB !== popA) {
        return popB - popA;
      }
      // Finally by release date (newest first)
      return new Date(b.release_date).getTime() - new Date(a.release_date).getTime();
    });
    
    return allContent;
  } catch (error) {
    return [];
  }
};

/**
 * Smart search - searches both movies and TV shows
 */
export const smartSearch = async (
  query: string,
  year?: number,
  includeAdult: boolean = false,
  region?: string
): Promise<MediaItem[]> => {
  try {
    const [movieResults, tvResults] = await Promise.all([
      searchMoviesByQuery(query, year, undefined, includeAdult, region),
      searchTVShowsByQuery(query, year, includeAdult, region)
    ]);
    
    const combinedResults = [...movieResults, ...tvResults];
    combinedResults.sort((a, b) => b.vote_average - a.vote_average);
    
    return combinedResults.slice(0, 6);
  } catch (error) {
    return [];
  }
};

/**
 * Get user watchlist
 */
export const getUserWatchlist = (userPrefs: UserPreferences | null): MediaItem[] => {
  return userPrefs?.watchlist || [];
};

/**
 * Get user favorites
 */
export const getUserFavorites = (userPrefs: UserPreferences | null): MediaItem[] => {
  return userPrefs?.favorites || [];
};

/**
 * Get user statistics
 */
export const getUserStats = (userPrefs: UserPreferences | null) => {
  const watchlist = userPrefs?.watchlist || [];
  const favorites = userPrefs?.favorites || [];
  const recentlyViewed = userPrefs?.recentlyViewed || [];
  
  const getTitle = (item: MediaItem) => {
    return 'title' in item ? item.title : item.name;
  };
  
  return {
    watchlistCount: watchlist.length,
    favoritesCount: favorites.length,
    recentlyViewedCount: recentlyViewed.length,
    recentlyAdded: watchlist[0] ? getTitle(watchlist[0]) : 'None',
    topGenres: userPrefs?.genres?.map(g => g.name).join(', ') || 'None',
    lastWatched: recentlyViewed[0] ? getTitle(recentlyViewed[0]) : 'None'
  };
};

/**
 * Get user notifications
 */
export const getUserNotifications = async (user: any) => {
  if (!user) return [];
  
  try {
    const q = query(
      collection(projectFirestore, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const notifications: any[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      notifications.push({
        id: doc.id,
        type: data.type,
        title: data.title,
        message: data.message,
        isRead: data.isRead,
        movieData: data.movieData,
        createdAt: data.createdAt?.toDate?.() || new Date()
      });
    });
    
    return notifications;
  } catch (error) {
    return [];
  }
};

/**
 * Add media to user watchlist
 */
export const addToWatchlist = async (user: any, mediaItem: MediaItem): Promise<boolean> => {
  if (!user) return false;
  
  try {
    const userDoc = await getDoc(doc(projectFirestore, 'users', user.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const currentWatchlist = userData.watchlist || [];
      
      const exists = currentWatchlist.some((item: MediaItem) => item.id === mediaItem.id);
      if (exists) return false;
      
      const updatedWatchlist = [mediaItem, ...currentWatchlist];
      
      await updateDoc(doc(projectFirestore, 'users', user.uid), {
        watchlist: updatedWatchlist,
        updatedAt: new Date()
      });
      
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
};

/**
 * Remove media from user watchlist
 */
export const removeFromWatchlist = async (user: any, mediaItem: MediaItem): Promise<boolean> => {
  if (!user) return false;
  
  try {
    const userDoc = await getDoc(doc(projectFirestore, 'users', user.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const currentWatchlist = userData.watchlist || [];

      const updatedWatchlist = currentWatchlist.filter((item: MediaItem) => {

        return item.id !== mediaItem.id;
      });

      if (updatedWatchlist.length === currentWatchlist.length) {

        return false;
      }
      
      await updateDoc(doc(projectFirestore, 'users', user.uid), {
        watchlist: updatedWatchlist,
        updatedAt: new Date()
      });

      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
};

/**
 * Get similar movies based on a movie title (uses TMDB recommendations)
 */
export const getSimilarMovies = async (
  movieTitle: string,
  includeAdult: boolean = false,
  region?: string,
  language?: string
): Promise<Movie[]> => {
  try {
    // First, search for the movie to get its ID
    const searchUrl = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(movieTitle)}&include_adult=${includeAdult}`;
    const searchResponse = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${TMDB_TOKEN}` },
    });
    const searchData = await searchResponse.json();
    
    if (!searchData.results || searchData.results.length === 0) {
      return [];
    }
    
    // Get the first (most relevant) movie's ID and details
    const sourceMovie = searchData.results[0];
    const movieId = sourceMovie.id;
    const sourceGenres = sourceMovie.genre_ids || [];
    
    // Use TMDB's official recommendations endpoint - this uses their sophisticated algorithm
    // that considers user ratings, viewing patterns, and movie similarity
    const recUrl = `https://api.themoviedb.org/3/movie/${movieId}/recommendations?language=${language || 'en-US'}&page=1`;
    const recResponse = await fetch(recUrl, {
      headers: { Authorization: `Bearer ${TMDB_TOKEN}` },
    });
    const recData = await recResponse.json();
    let recommendationResults = recData.results || [];
    
    // If we need more results, get page 2 as well
    if (recData.total_pages > 1 && recommendationResults.length < 20) {
      const recUrl2 = `https://api.themoviedb.org/3/movie/${movieId}/recommendations?language=${language || 'en-US'}&page=2`;
      const recResponse2 = await fetch(recUrl2, {
        headers: { Authorization: `Bearer ${TMDB_TOKEN}` },
      });
      const recData2 = await recResponse2.json();
      recommendationResults = [...recommendationResults, ...(recData2.results || [])];
    }
    
    // Apply content filtering
    let filteredResults = recommendationResults;
    if (!includeAdult) {
      filteredResults = filterSearchResults(filteredResults, 'filtered');
      filteredResults = filteredResults.filter((movie: any) => !isAdultContent(movie));
    }
    
    // Filter by language based on region preference and language setting
    filteredResults = filterByLanguage(filteredResults, region, language);
    
    // Exclude the source movie itself
    filteredResults = filteredResults.filter((movie: any) => movie.id !== movieId);
    
    // Return top 6 results by default (TMDB's recommendations are already sorted by relevance)
    // User can ask for more if needed
    return filteredResults.slice(0, 6).map((movie: any) => {
      return {
        id: movie.id,
        title: movie.title,
        overview: movie.overview,
        release_date: movie.release_date,
        vote_average: movie.vote_average,
        vote_count: movie.vote_count,
        poster_path: movie.poster_path,
        backdrop_path: movie.backdrop_path,
        genre_ids: movie.genre_ids,
        popularity: movie.popularity,
        media_type: 'movie' as const
      };
    });
  } catch (error) {
    return [];
  }
};

/**
 * Search for faith-based/Christian movies by searching specific known titles
 * Since TMDB doesn't have a "Christian" genre, we search for popular faith-based titles
 */
export const searchChristianMovies = async (
  includeAdult: boolean = false
): Promise<Movie[]> => {
  const faithBasedTitles = [
    "God's Not Dead",
    "The Passion of the Christ",
    "Heaven is for Real",
    "I Can Only Imagine",
    "The Shack",
    "War Room",
    "Miracles from Heaven",
    "Soul Surfer",
    "Fireproof",
    "Facing the Giants",
    "Courageous",
    "The Case for Christ"
  ];
  
  try {
    const searchPromises = faithBasedTitles.map(title => 
      searchMoviesByQuery(title, undefined, undefined, includeAdult)
    );
    
    const results = await Promise.all(searchPromises);
    const allMovies = results.flat();
    
    // Remove duplicates and return top results
    const uniqueMovies = allMovies.filter((movie, index, self) =>
      index === self.findIndex((m) => m.id === movie.id)
    );
    
    return uniqueMovies.slice(0, 6);
  } catch (error) {
    return [];
  }
};

