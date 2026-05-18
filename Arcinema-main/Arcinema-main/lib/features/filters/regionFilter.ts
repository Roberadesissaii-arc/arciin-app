// lib/regionFilter.ts

// Country code mappings
const COUNTRY_MAPPINGS: Record<string, string[]> = {
  'US': ['US', 'USA', 'United States'],
  'GB': ['GB', 'UK', 'United Kingdom'],
  'CA': ['CA', 'Canada'],
  'AU': ['AU', 'Australia'],
  'DE': ['DE', 'Germany'],
  'FR': ['FR', 'France'],
  'IT': ['IT', 'Italy'],
  'ES': ['ES', 'Spain'],
  'JP': ['JP', 'Japan'],
  'KR': ['KR', 'South Korea'],
  'CN': ['CN', 'China'],
  'IN': ['IN', 'India'],
  'BR': ['BR', 'Brazil'],
  'MX': ['MX', 'Mexico'],
  'RU': ['RU', 'Russia'],
  'NL': ['NL', 'Netherlands'],
  'SE': ['SE', 'Sweden'],
  'NO': ['NO', 'Norway'],
  'DK': ['DK', 'Denmark'],
  'FI': ['FI', 'Finland'],
};

interface MediaItem {
  id: number;
  title?: string;
  name?: string;
  origin_country?: string[];
  original_language?: string;
  production_countries?: Array<{ iso_3166_1: string; name: string }>;
}

/**
 * Filter content by production country for more accurate regional filtering
 */
export function filterByProductionCountry<T extends MediaItem>(
  items: T[],
  selectedCountry: string
): T[] {
  if (!selectedCountry || selectedCountry === 'all') {
    return items;
  }

  return items.filter(item => {
    // Check origin_country (TV shows)
    if (item.origin_country && item.origin_country.length > 0) {
      return item.origin_country.includes(selectedCountry);
    }

    // Check production_countries (Movies - if available)
    if (item.production_countries && item.production_countries.length > 0) {
      return item.production_countries.some(country => 
        country.iso_3166_1 === selectedCountry
      );
    }

    // Check original_language as a fallback
    if (item.original_language) {
      // Map common languages to countries
      const languageCountryMap: Record<string, string> = {
        'en': 'US',
        'ja': 'JP',
        'ko': 'KR',
        'zh': 'CN',
        'fr': 'FR',
        'de': 'DE',
        'es': 'ES',
        'it': 'IT',
        'pt': 'BR',
        'ru': 'RU',
        'hi': 'IN',
        'nl': 'NL',
        'sv': 'SE',
        'no': 'NO',
        'da': 'DK',
        'fi': 'FI',
      };

      const inferredCountry = languageCountryMap[item.original_language];
      if (inferredCountry === selectedCountry) {
        return true;
      }
    }

    // If no country information is available, don't filter it out
    // This ensures we don't lose content due to incomplete metadata
    return true;
  });
}

/**
 * Get priority score for content based on country preference
 * Higher score = higher priority
 */
export function getCountryPriorityScore(
  item: MediaItem,
  selectedCountry: string
): number {
  if (!selectedCountry || selectedCountry === 'all') {
    return 1; // Neutral score
  }

  // Exact country match gets highest priority
  if (item.origin_country?.includes(selectedCountry)) {
    return 3;
  }

  if (item.production_countries?.some(country => 
    country.iso_3166_1 === selectedCountry
  )) {
    return 3;
  }

  // Language-based inference gets medium priority
  if (item.original_language) {
    const languageCountryMap: Record<string, string> = {
      'en': 'US',
      'ja': 'JP',
      'ko': 'KR',
      'zh': 'CN',
      'fr': 'FR',
      'de': 'DE',
      'es': 'ES',
      'it': 'IT',
      'pt': 'BR',
      'ru': 'RU',
      'hi': 'IN',
    };

    const inferredCountry = languageCountryMap[item.original_language];
    if (inferredCountry === selectedCountry) {
      return 2;
    }
  }

  // Everything else gets lower priority
  return 1;
}
