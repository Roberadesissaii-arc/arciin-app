// lib/watchProvidersApi.ts
interface WatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
}

interface WatchProvidersResponse {
  id: number;
  results: {
    [region: string]: {
      link?: string;
      rent?: WatchProvider[];
      buy?: WatchProvider[];
      flatrate?: WatchProvider[];
    };
  };
}

const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

/**
 * Get watch providers for a specific movie
 */
export async function getMovieWatchProviders(movieId: number, region: string = 'US'): Promise<WatchProvider[]> {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/movie/${movieId}/watch/providers?api_key=${TMDB_API_KEY}`,
      { next: { revalidate: 3600 } } // Cache for 1 hour
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch movie watch providers: ${response.status}`);
    }

    const data: WatchProvidersResponse = await response.json();
    
    // Extract providers for the specified region (default to US)
    const regionProviders = data.results[region];
    if (!regionProviders) return [];

    // Combine all provider types - check all sources
    const allProviders: WatchProvider[] = [];
    
    // 1. Streaming services (flatrate) - highest priority
    if (regionProviders.flatrate && regionProviders.flatrate.length > 0) {
      allProviders.push(...regionProviders.flatrate);
    }
    
    // 2. Rental options
    if (regionProviders.rent && regionProviders.rent.length > 0) {
      allProviders.push(...regionProviders.rent);
    }
    
    // 3. Purchase options
    if (regionProviders.buy && regionProviders.buy.length > 0) {
      allProviders.push(...regionProviders.buy);
    }

    // Remove duplicates based on provider_id
    const uniqueProviders = allProviders.filter((provider, index, self) =>
      index === self.findIndex(p => p.provider_id === provider.provider_id)
    );

    return uniqueProviders;
  } catch (error) {
    return [];
  }
}

/**
 * Get watch providers for a specific TV show
 */
export async function getTVShowWatchProviders(tvId: number, region: string = 'US'): Promise<WatchProvider[]> {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/tv/${tvId}/watch/providers?api_key=${TMDB_API_KEY}`,
      { next: { revalidate: 3600 } } // Cache for 1 hour
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch TV show watch providers: ${response.status}`);
    }

    const data: WatchProvidersResponse = await response.json();
    
    // Extract providers for the specified region (default to US)
    const regionProviders = data.results[region];
    if (!regionProviders) return [];

    // Combine all provider types - check all sources
    const allProviders: WatchProvider[] = [];
    
    // 1. Streaming services (flatrate) - highest priority
    if (regionProviders.flatrate && regionProviders.flatrate.length > 0) {
      allProviders.push(...regionProviders.flatrate);
    }
    
    // 2. Rental options
    if (regionProviders.rent && regionProviders.rent.length > 0) {
      allProviders.push(...regionProviders.rent);
    }
    
    // 3. Purchase options
    if (regionProviders.buy && regionProviders.buy.length > 0) {
      allProviders.push(...regionProviders.buy);
    }

    // Remove duplicates based on provider_id
    const uniqueProviders = allProviders.filter((provider, index, self) =>
      index === self.findIndex(p => p.provider_id === provider.provider_id)
    );

    return uniqueProviders;
  } catch (error) {
    return [];
  }
}

/**
 * Get watch providers for any media (movie or TV show)
 */
export async function getWatchProviders(
  mediaId: number, 
  mediaType: 'movie' | 'tv', 
  region: string = 'US'
): Promise<WatchProvider[]> {
  if (mediaType === 'movie') {
    return getMovieWatchProviders(mediaId, region);
  } else {
    return getTVShowWatchProviders(mediaId, region);
  }
}

/**
 * Get the primary (first) streaming provider for a media item
 * Returns the first provider that we have a local logo for
 */
export async function getPrimaryStreamingProvider(
  mediaId: number, 
  mediaType: 'movie' | 'tv', 
  region: string = 'US'
): Promise<WatchProvider | null> {
  const providers = await getWatchProviders(mediaId, mediaType, region);
  
  // Find the first provider that we have a logo for
  for (const provider of providers) {
    const localLogo = mapProviderToLocal(provider);
    if (localLogo) {
      return provider;
    }
  }
  
  return null;
}

/**
 * Map TMDB provider to local provider logo
 */
export function mapProviderToLocal(provider: WatchProvider): string | null {
  const providerMappings: { [key: number]: string } = {
    // Primary Streaming Services
    8: 'netflix.png',              // Netflix
    337: 'disney.png',             // Disney Plus
    350: 'apple-tv-plus-logo.png', // Apple TV Plus
    384: 'hbomax.png',             // HBO Max
    1899: 'hbomax.png',            // Max (formerly HBO Max)
    15: 'hulu.png',                // Hulu
    9: 'prime video.png',          // Amazon Prime Video
    386: 'peacock.png',            // Peacock
    531: 'Paramount-Logo.png',     // Paramount Plus
    387: 'showtime-2-logo-png-transparent.png', // Showtime
    257: 'fubotv-logo-freelogovectors.net_.png', // FuboTV
    43: 'Starz-Logo-Vector.svg-.png', // Starz
    
    // Apple Ecosystem
    2: 'apple-tv-plus-logo.png',   // Apple iTunes
    10: 'YouTube-Logo.png',        // YouTube Movies
    
    // AMC+ and Theater Chains
    526: 'AMC-Logo-PNG-Picture.png', // AMC+
    80: 'AMC-Logo-PNG-Picture.png',  // AMC
    // Theater chains (using existing or new logos)
    // Note: TMDB doesn't typically provide theater chain IDs, but we can map if found
    
    // Rental/Purchase Services (use YouTube as generic icon)
    3: 'YouTube-Logo.png',         // Google Play Movies & TV
    68: 'YouTube-Logo.png',        // Microsoft Store  
    7: 'YouTube-Logo.png',         // Vudu
    279: 'YouTube-Logo.png',       // Redbox
    358: 'YouTube-Logo.png',       // DIRECTV
    
    // Virtual provider IDs for rental/purchase
    999999: 'YouTube-Logo.png',    // Virtual rental provider
    999998: 'YouTube-Logo.png',    // Virtual purchase provider
    
    // Additional streaming services
    167: 'hulu.png',               // Crunchyroll (fallback to Hulu)
    283: 'YouTube-Logo.png',       // Crackle
    619: 'hbomax.png',             // HBO Go (use HBO Max logo)
    1796: 'netflix.png',           // Netflix basic with ads
    1825: 'hulu.png',              // Hulu (No Ads)
    1971: 'paramount-logo.png',    // Paramount Plus (Premium)
    
    // More international services
    119: 'prime video.png',        // Amazon Prime Video (international)
    182: 'netflix.png',            // Netflix Kids
    
    // Cinema chains (if they ever get provider IDs)
    // We'll handle theater detection in the component logic instead
    1770: 'aha_logo.png',          // Aha Video
    
    // Add more mappings as needed
  };

  return providerMappings[provider.provider_id] || null;
}

/**
 * Get the local provider logo path for a media item
 */
export async function getLocalProviderLogo(
  mediaId: number, 
  mediaType: 'movie' | 'tv', 
  region: string = 'US'
): Promise<string | null> {
  const primaryProvider = await getPrimaryStreamingProvider(mediaId, mediaType, region);
  
  if (!primaryProvider) return null;
  
  return mapProviderToLocal(primaryProvider);
}