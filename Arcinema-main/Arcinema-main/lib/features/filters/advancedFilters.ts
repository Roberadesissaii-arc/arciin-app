// lib/advancedFilters.ts
// Advanced filtering system for language, country, and content

import { SavedMedia } from "@/types/user";

interface FilterOptions {
  language?: string;
  country?: string;
  contentFilter?: 'all' | 'filtered' | 'kids';
}

interface MovieDetails {
  adult: boolean;
  original_language: string;
  spoken_languages?: Array<{ iso_639_1: string; name: string }>;
  production_countries?: Array<{ iso_3166_1: string; name: string }>;
  genres?: Array<{ id: number; name: string }>;
  vote_average?: number;
  popularity?: number;
}

// Adult/mature genre IDs from TMDB
const ADULT_GENRE_IDS = [
  10749, // Romance (can be mature)
  53,    // Thriller (often mature)
  80,    // Crime (often mature)
  27,    // Horror
];

// Family-friendly genre IDs
const FAMILY_GENRE_IDS = [
  16,    // Animation
  10751, // Family
  14,    // Fantasy
  12,    // Adventure
  35,    // Comedy
  10402, // Music
];

// Kids-safe genre IDs
const KIDS_GENRE_IDS = [
  16,    // Animation
  10751, // Family
];

/**
 * Filter content based on language preference
 * This checks both original language and spoken languages
 */
export async function filterByLanguage(
  mediaId: number,
  mediaType: 'movie' | 'tv',
  targetLanguage: string
): Promise<boolean> {
  if (!targetLanguage || targetLanguage === 'en') {
    return true; // English is default, allow all
  }

  try {
    const API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
    const response = await fetch(
      `https://api.themoviedb.org/3/${mediaType}/${mediaId}?api_key=${API_KEY}&append_to_response=translations`
    );
    
    if (!response.ok) return true; // If we can't verify, allow it
    
    const data = await response.json();
    
    // Check original language
    if (data.original_language === targetLanguage) {
      return true;
    }
    
    // Check spoken languages
    if (data.spoken_languages?.some((lang: any) => 
      lang.iso_639_1 === targetLanguage
    )) {
      return true;
    }
    
    // Check if there's a translation/dub available
    if (data.translations?.translations?.some((translation: any) => 
      translation.iso_639_1 === targetLanguage
    )) {
      return true;
    }
    
    return false;
  } catch (error) {
    return true; // Allow on error
  }
}

/**
 * Filter content based on country/region
 * This checks production countries and origin country
 */
export async function filterByCountry(
  mediaId: number,
  mediaType: 'movie' | 'tv',
  targetCountry: string
): Promise<boolean> {
  if (!targetCountry || targetCountry === 'all') {
    return true; // Show all countries
  }

  try {
    const API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
    const response = await fetch(
      `https://api.themoviedb.org/3/${mediaType}/${mediaId}?api_key=${API_KEY}`
    );
    
    if (!response.ok) return true;
    
    const data = await response.json();
    
    // Check production countries
    if (data.production_countries?.some((country: any) => 
      country.iso_3166_1 === targetCountry
    )) {
      return true;
    }
    
    // Check origin country (for TV shows)
    if (data.origin_country?.includes(targetCountry)) {
      return true;
    }
    
    return false;
  } catch (error) {
    return true;
  }
}

/**
 * Advanced content filter that's smarter about what to filter
 * Instead of blocking everything, it uses genre, rating, and popularity
 */
export function filterByContentRating(
  media: SavedMedia | MovieDetails,
  filterLevel: 'all' | 'filtered' | 'kids'
): boolean {
  if (filterLevel === 'all') {
    return true; // Show everything
  }

  const adult = (media as any).adult || false;
  const genres = (media as any).genres || (media as any).genre_ids || [];
  const voteAverage = (media as any).vote_average || 0;
  const popularity = (media as any).popularity || 0;

  // Always block explicitly adult content
  if (adult) {
    return false;
  }

  if (filterLevel === 'kids') {
    // Kids mode: Only show content with family/kids genres
    const hasKidsGenre = genres.some((g: any) => 
      KIDS_GENRE_IDS.includes(typeof g === 'object' ? g.id : g)
    );
    
    // Also require good ratings and popularity for kids content
    return hasKidsGenre && voteAverage >= 6.5 && popularity > 10;
  }

  if (filterLevel === 'filtered') {
    // Filtered mode: Smart filtering
    // Block low-rated content with mature genres
    const hasMatureGenre = genres.some((g: any) => 
      ADULT_GENRE_IDS.includes(typeof g === 'object' ? g.id : g)
    );
    
    // If it has mature genres, require higher rating and popularity
    if (hasMatureGenre) {
      // Allow popular, well-rated content even with mature genres
      // This prevents blocking legitimate movies/shows
      return voteAverage >= 7.0 && popularity > 50;
    }
    
    // For non-mature genres, be more lenient
    return voteAverage >= 5.5;
  }

  return true;
}

/**
 * Apply all filters to a single media item
 */
export async function applyAllFilters(
  media: SavedMedia,
  options: FilterOptions
): Promise<boolean> {
  // Content filter (synchronous)
  if (options.contentFilter) {
    const passesContentFilter = filterByContentRating(media, options.contentFilter);
    if (!passesContentFilter) {
      return false;
    }
  }

  // Language filter (requires API call)
  if (options.language && options.language !== 'en') {
    const mediaType = media.media_type === 'tv' ? 'tv' : 'movie';
    const passesLanguageFilter = await filterByLanguage(
      media.id,
      mediaType,
      options.language
    );
    if (!passesLanguageFilter) {
      return false;
    }
  }

  // Country filter (requires API call)
  if (options.country && options.country !== 'all') {
    const mediaType = media.media_type === 'tv' ? 'tv' : 'movie';
    const passesCountryFilter = await filterByCountry(
      media.id,
      mediaType,
      options.country
    );
    if (!passesCountryFilter) {
      return false;
    }
  }

  return true;
}

/**
 * Batch filter multiple media items
 * This is more efficient than filtering one by one
 */
export async function batchFilterMedia(
  mediaList: SavedMedia[],
  options: FilterOptions
): Promise<SavedMedia[]> {
  // First apply content filter (fast, synchronous)
  let filtered = mediaList;
  
  if (options.contentFilter && options.contentFilter !== 'all') {
    filtered = filtered.filter(media => 
      filterByContentRating(media, options.contentFilter!)
    );
  }

  // If no language or country filter, return now
  if ((!options.language || options.language === 'en') && 
      (!options.country || options.country === 'all')) {
    return filtered;
  }

  // Apply language and country filters in parallel
  const filterResults = await Promise.all(
    filtered.map(async (media) => {
      const mediaType = media.media_type === 'tv' ? 'tv' : 'movie';
      
      // Check language
      if (options.language && options.language !== 'en') {
        const passesLanguage = await filterByLanguage(
          media.id,
          mediaType,
          options.language
        );
        if (!passesLanguage) return null;
      }
      
      // Check country
      if (options.country && options.country !== 'all') {
        const passesCountry = await filterByCountry(
          media.id,
          mediaType,
          options.country
        );
        if (!passesCountry) return null;
      }
      
      return media;
    })
  );

  // Remove null values (filtered out items)
  return filterResults.filter((media): media is SavedMedia => media !== null);
}

/**
 * Get filter summary text for UI
 */
export function getFilterSummary(options: FilterOptions): string {
  const parts: string[] = [];
  
  if (options.language && options.language !== 'en') {
    const langMap: Record<string, string> = {
      es: 'Spanish',
      fr: 'French',
      de: 'German',
      it: 'Italian',
      ja: 'Japanese',
      ko: 'Korean',
      zh: 'Chinese',
      pt: 'Portuguese',
      ru: 'Russian',
      ar: 'Arabic',
    };
    parts.push(`Language: ${langMap[options.language] || options.language}`);
  }
  
  if (options.country && options.country !== 'all') {
    parts.push(`Country: ${options.country}`);
  }
  
  if (options.contentFilter && options.contentFilter !== 'all') {
    const filterMap = {
      filtered: 'Filtered Content',
      kids: 'Kids Mode'
    };
    parts.push(filterMap[options.contentFilter] || 'Filtered');
  }
  
  return parts.length > 0 ? parts.join(' • ') : 'No filters active';
}
