// lib/cineai/utils.ts
// Utility functions for MovieVerse AI Chat

import { MediaItem, Movie } from '@/types/ai-chat';
import { filterSearchResults, isAdultContent } from '@/lib/features/filters/contentFilter';

/**
 * Convert theme requests to appropriate search terms
 */
export const getThemeSearchTerms = (query: string): string[] => {
  if (!query || typeof query !== 'string') {
    return ['popular', 'trending']; // Default fallback
  }
  
  const lowerQuery = query.toLowerCase();
  
  // Christian/Faith-based movies
  if (lowerQuery.includes('christian') || lowerQuery.includes('faith') || lowerQuery.includes('religious')) {
    return ['Jesus', 'Bible', 'faith', 'God', 'gospel', 'prayer', 'church', 'miracle', 'heaven', 'apostle'];
  }
  
  // Horror movies
  if (lowerQuery.includes('horror') || lowerQuery.includes('scary')) {
    return ['horror', 'ghost', 'demon', 'vampire', 'zombie', 'haunted', 'evil', 'nightmare'];
  }
  
  // Romance movies
  if (lowerQuery.includes('romance') || lowerQuery.includes('love')) {
    return ['love', 'romance', 'romantic', 'wedding', 'heart', 'relationship', 'couple'];
  }
  
  // War movies
  if (lowerQuery.includes('war') || lowerQuery.includes('military')) {
    return ['war', 'battle', 'military', 'soldier', 'combat', 'army', 'navy', 'marines'];
  }
  
  // Sports movies
  if (lowerQuery.includes('sport') || lowerQuery.includes('athlete')) {
    return ['football', 'basketball', 'boxing', 'sports', 'athlete', 'championship', 'team'];
  }
  
  // Space/Sci-fi movies
  if (lowerQuery.includes('space') || lowerQuery.includes('alien')) {
    return ['space', 'alien', 'galaxy', 'planet', 'astronaut', 'universe', 'mars'];
  }
  
  // Default: return the original query
  return [query];
};

/**
 * Check if movie content is supplementary (soundtracks, behind-the-scenes, etc.)
 */
export const isSupplementaryContent = (movie: any): boolean => {
  if (!movie || !movie.title) return false;
  
  const title = movie.title.toLowerCase();
  const supplementaryKeywords = [
    'soundtrack', 'making of', 'behind the scenes', 'documentary about',
    'the art of', 'interviews', 'featurette', 'bonus', 'special edition'
  ];
  
  return supplementaryKeywords.some(keyword => title.includes(keyword));
};

/**
 * Extract movie titles from text and fetch their details
 */
export const extractAndFetchMovies = async (text: string, includeAdult: boolean = false): Promise<MediaItem[]> => {
  const movieTitles = text.match(/"([^"]+)"/g)?.map(t => t.replace(/"/g, '')) || [];
  if (movieTitles.length === 0) return [];

  const moviePromises = movieTitles.map(async (title) => {
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(title)}&page=1&include_adult=${includeAdult}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_TMDB_API_READ_ACCESS_TOKEN}`,
          },
        }
      );
      const data = await response.json();
      
      // Apply content filtering to search results
      let filteredResults = data.results;
      if (!includeAdult) {
        filteredResults = filterSearchResults(data.results, 'filtered');
        filteredResults = filteredResults.filter((movie: any) => !isAdultContent(movie));
      }
      
      const movie = filteredResults.find((m: { poster_path: string; title: string }) => 
        m.poster_path && 
        (m.title.toLowerCase() === title.toLowerCase() ||
         m.title.toLowerCase().includes(title.toLowerCase()))
      );
      return movie ? { ...movie, media_type: 'movie' as const } : null;
    } catch (error) {
      return null;
    }
  });

  const movies = await Promise.all(moviePromises);
  return movies.filter((movie): movie is MediaItem => movie !== null);
};

/**
 * Check if a line is a section title (for message formatting)
 */
export const isSectionTitle = (line: string): boolean => {
  return /^([\d]+\.|[🎬🎭🎪🎨🎯🎮🎲🎰🎳🏆🏅🎖️⭐🌟💫✨🎉🎊]|\*\*)/.test(line.trim());
};

/**
 * Get title from media item (works for both Movie and TVShow)
 */
export const getMediaTitle = (item: MediaItem): string => {
  return 'title' in item ? item.title : (item as any).name;
};

/**
 * Get release date from media item (works for both Movie and TVShow)
 */
export const getMediaReleaseDate = (item: MediaItem): string => {
  return 'release_date' in item ? item.release_date : (item as any).first_air_date || '';
};

/**
 * Get media type label
 */
export const getMediaTypeLabel = (item: MediaItem): string => {
  return item.media_type === 'tv' ? 'TV Show' : item.media_type === 'person' ? 'Person' : 'Movie';
};

/**
 * Remove duplicate media items by ID
 */
export const uniqueMediaItems = (items: MediaItem[]): MediaItem[] => {
  return Array.from(new Set(items.map(m => m.id)))
    .map(id => items.find(m => m.id === id))
    .filter((item): item is MediaItem => item !== undefined);
};
