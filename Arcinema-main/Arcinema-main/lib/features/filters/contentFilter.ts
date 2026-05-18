// lib/contentFilter.ts

export type ContentFilterLevel = 'all' | 'filtered' | 'kids';

interface FilterConfig {
  includeAdult: boolean;
  genreFilter?: number[]; // Genre IDs to filter out for kids mode
  ratingFilter?: string[]; // Rating certifications to filter
}

// TMDB Genre IDs that are not suitable for kids
const ADULT_GENRE_IDS = [
  28,    // Action (some violent content)
  53,    // Thriller  
  27,    // Horror
  80,    // Crime
  9648,  // Mystery (can be scary)
  10749, // Romance (mature themes)
  18,    // Drama (can have mature themes)
];

// Additional genres to filter in kids mode (keeping only family-friendly)
const KIDS_ALLOWED_GENRES = [
  16,    // Animation
  35,    // Comedy (family-friendly)
  10751, // Family
  14,    // Fantasy
  10402, // Music
  12,    // Adventure (age-appropriate)
  878,   // Science Fiction (age-appropriate)
  10762, // Kids
];

// Genres that should be heavily filtered for adult content
const ADULT_PRONE_GENRES = [
  10749, // Romance - prone to adult content
  18,    // Drama - can contain mature themes
  53,    // Thriller - often contains violence/adult themes
  9648,  // Mystery - can be dark/adult
];

// Adult/inappropriate keywords that should be blocked in kids mode
const ADULT_KEYWORDS = [
  'porn', 'sex', 'adult', 'xxx', 'erotic', 'sexy', 'nude', 'naked', 'violence',
  'kill', 'murder', 'blood', 'gore', 'horror', 'scary', 'death', 'war',
  'crime', 'drugs', 'alcohol', 'gambling', 'mature', 'explicit', 'nsfw',
  'anal', 'lesbian', 'gay', 'bisexual', 'fetish', 'bdsm', 'kink', 'strip',
  'prostitute', 'escort', 'brothel', 'magazine', 'playboy', 'hustler',
  'bikini', 'swimsuit', 'lingerie', 'underwear', 'pantyhose', 'stockings',
  'seduction', 'affair', 'cheating', 'mistress', 'lover', 'passion',
  'intimate', 'sensual', 'temptation', 'desire', 'lust', 'forbidden'
];

// Additional patterns to detect adult content
const ADULT_PATTERNS = [
  /\b(porn|sex|adult|xxx|erotic|nude|naked)\b/i,
  /\b(anal|oral|lesbian|gay|bisexual)\b/i,
  /\b(fetish|bdsm|kink|strip|prostitute)\b/i,
  /\b(magazine|playboy|hustler|penthouse)\b/i,
  /\b(filthy|dirty|nasty|wild|kinky)\b/i,
  /\b(bikini|lingerie|underwear|pantyhose)\b/i,
  /\b(seduction|affair|cheating|mistress)\b/i,
  /\b(intimate|sensual|temptation|desire|lust)\b/i,
  /\b(forbidden|passionate|steamy|hot)\b/i
];

// Check if content is adult/inappropriate based on multiple criteria
export function isAdultContent(item: any): boolean {
  const title = (item.title || item.name || '').toLowerCase();
  const overview = (item.overview || '').toLowerCase();
  const genres = item.genre_ids || [];
  
  // Check for explicit adult flag
  if (item.adult === true) return true;
  
  // Check for adult keywords in title
  const titleHasAdult = ADULT_KEYWORDS.some(keyword => title.includes(keyword));
  if (titleHasAdult) return true;
  
  // Check for adult patterns in title
  const titleMatchesPattern = ADULT_PATTERNS.some(pattern => pattern.test(title));
  if (titleMatchesPattern) return true;
  
  // Check overview for adult content
  const overviewHasAdult = ADULT_KEYWORDS.some(keyword => overview.includes(keyword));
  if (overviewHasAdult) return true;
  
  // Check overview for adult patterns
  const overviewMatchesPattern = ADULT_PATTERNS.some(pattern => pattern.test(overview));
  if (overviewMatchesPattern) return true;
  
// Enhanced filtering for known problematic content types
  const suspiciousPatterns = [
    /\b(magazine|model|photo|photography)\b/i,
    /\b(japanese|korean|asian|chinese).*\b(women|girls|models|mom|mother|sister|wife)\b/i,
    /\b(women|girls|models|mom|mother|sister|wife).*\b(japanese|korean|asian|chinese)\b/i,
    /\b(calendar|photograph|picture|photobook)\b/i,
    /\b(jav|av|gravure|idol)\b/i,
    /\b(schoolgirl|school.*girl|student.*girl)\b/i
  ];
  
  const isSuspicious = suspiciousPatterns.some(pattern => 
    pattern.test(title) || pattern.test(overview)
  );
  
  // Immediately block obvious adult content patterns and known problematic titles
  const explicitAdultPatterns = [
    /\b(sex|hot.*sex|immoral.*sex|forbidden.*sex)\b/i,
    /\b(stepmother|stepmom|step.*mother|stepmom.*desire)\b/i,
    /\b(swapping|swap|sister.*swap|sister.*swapping)\b/i,
    /\b(tuhog|intimacy|ritual)\b/i, // Block specific problematic titles
    /\b(working.*woman.*dressed|fully.*dressed)\b/i,
    /\b(trio|threesome|group)\b/i,
    /\b(japanese.*mom|korean.*mom|asian.*mom)\b/i,
    /\b(mom|mother).*\b(japanese|korean|asian)\b/i,
    /\b(forbidden.*immoral|immoral.*forbidden)\b/i,
    /\b(vengeance|unplugged|materialists)\b/i,
    /\b(jokōsei|saiyaara|belyas|maalikaya)\b/i, // Block specific inappropriate titles
    /\b(muromachi.*burai|hot.*sex.*with)\b/i,
    /\b(glamorous.*tides|ssis-531|studio.*s1)\b/i, // Block JAV/Adult video titles
    /\b(ayaka.*kawakita|hikaru.*nagi|avina)\b/i, // Block adult performer names
    /\b(taste|sister.*taste|inuman.*session)\b/i,
    /\b(aşk.*sadece|skin.*like.*sun|laila)\b/i // Block more problematic titles
  ];
  
  if (explicitAdultPatterns.some(pattern => pattern.test(title) || pattern.test(overview))) {
    return true;
  }
  
  if (isSuspicious) {
    // Additional checks for context - if it's clearly about photography/modeling, likely adult
    const contextualAdult = [
      /\b(beautiful|sexy|gorgeous|stunning|hot).*\b(women|girls|models)\b/i,
      /\b(women|girls|models).*\b(beautiful|sexy|gorgeous|stunning|hot)\b/i,
      /\b(swimsuit|bikini|lingerie|underwear|dressed|undressed)\b/i,
      /\b(immoral|forbidden|vengeance|unplugged)\b/i
    ];
    
    if (contextualAdult.some(pattern => pattern.test(title) || pattern.test(overview))) {
      return true;
    }
  }
  
  // Block content with very low ratings (likely adult/exploitation content)
  if (item.vote_average && item.vote_average < 4.0 && item.vote_count && item.vote_count < 50) {
    // Check if it has suspicious keywords combined with low rating
    if (suspiciousPatterns.some(pattern => pattern.test(title) || pattern.test(overview))) {
      return true;
    }
  }
  
  // Filter out content with Asian languages that's likely miscategorized adult content
  // This is specifically for romance/drama filtering issues
  if (item.original_language && ['ja', 'ko', 'zh'].includes(item.original_language)) {
    // Check for common patterns in miscategorized Asian adult content
    const asianAdultPatterns = [
      /\b(collection|best|complete)\b/i,
      /\b(vol|volume|part)\s*\d+/i,
      /\b(series|episode)\b/i,
      /\b\d{4}\b.*\b(calendar|photo)\b/i, // Year + calendar/photo
      /\b(beauty|beauties)\b/i,
    ];
    
    const hasAsianAdultPattern = asianAdultPatterns.some(pattern => 
      pattern.test(title) || pattern.test(overview)
    );
    
    // If it has suspicious Asian patterns AND is categorized as romance/drama, likely inappropriate
    const hasRomanceDrama = genres.includes(10749) || genres.includes(18); // Romance or Drama
    
    if (hasAsianAdultPattern && hasRomanceDrama) {
      return true;
    }
  }
  
  // Special checks for documentaries about adult topics
  if (item.media_type === 'movie' || item.media_type === 'tv') {
    // Check if it's a documentary with adult themes
    const isDocumentary = genres.includes(99); // Documentary genre
    if (isDocumentary && (titleHasAdult || overviewHasAdult)) {
      return true;
    }
    
    // Check for magazine-style content
    if (title.includes('magazine') || title.includes('playboy') || title.includes('hustler')) {
      return true;
    }
  }
  
  return false;
}

// Enhanced function to prioritize quality American/English content for sensitive genres
export function prioritizeQualityContent(results: any[], userCountry: string = 'US'): any[] {
  if (!results || results.length === 0) return results;
  
  // First pass: Filter out inappropriate content but be less aggressive to keep more results
  const filtered = results.filter(item => {
    // Block all adult content patterns first
    if (isAdultContent(item)) return false;
    
    // For Romance/Drama, be selective with Asian content but not too strict
    const genres = item.genre_ids || [];
    const hasRomanceDrama = genres.includes(10749) || genres.includes(18);
    
    if (hasRomanceDrama && item.original_language && ['ja', 'ko', 'zh', 'th', 'vi', 'id'].includes(item.original_language)) {
      // Block Asian romance/drama with very low quality only
      if (!item.vote_average || item.vote_average < 5.0 || !item.vote_count || item.vote_count < 20) {
        return false;
      }
    }
    
    // Much lower quality standards to keep more content
    if (!item.vote_average || item.vote_average < 3.0) {
      return false;
    }
    
    return true;
  });
  
  // Sort to prioritize content based on quality indicators
  return filtered.sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;
    
    // Boost English language content
    if (a.original_language === 'en') scoreA += 10;
    if (b.original_language === 'en') scoreB += 10;
    
    // Boost content from preferred countries
    const preferredCountries = ['US', 'GB', 'CA', 'AU'];
    if (a.origin_country && a.origin_country.some((country: string) => preferredCountries.includes(country))) {
      scoreA += 8;
    }
    if (b.origin_country && b.origin_country.some((country: string) => preferredCountries.includes(country))) {
      scoreB += 8;
    }
    
    // Boost content with higher ratings and vote counts
    if (a.vote_average && a.vote_average > 6.5) scoreA += 5;
    if (b.vote_average && b.vote_average > 6.5) scoreB += 5;
    
    if (a.vote_count && a.vote_count > 100) scoreA += 3;
    if (b.vote_count && b.vote_count > 100) scoreB += 3;
    
    // Boost major studio productions
    const majorStudios = ['Warner Bros', 'Universal Pictures', 'Paramount', 'Sony Pictures', 'Disney', 'Netflix'];
    const aHasMajorStudio = a.production_companies?.some((company: any) => 
      majorStudios.some(studio => company.name?.toLowerCase().includes(studio.toLowerCase()))
    );
    const bHasMajorStudio = b.production_companies?.some((company: any) => 
      majorStudios.some(studio => company.name?.toLowerCase().includes(studio.toLowerCase()))
    );
    
    if (aHasMajorStudio) scoreA += 4;
    if (bHasMajorStudio) scoreB += 4;
    
    // Boost newer content
    const currentYear = new Date().getFullYear();
    const aYear = a.release_date ? new Date(a.release_date).getFullYear() : a.first_air_date ? new Date(a.first_air_date).getFullYear() : 0;
    const bYear = b.release_date ? new Date(b.release_date).getFullYear() : b.first_air_date ? new Date(b.first_air_date).getFullYear() : 0;
    
    if (aYear > currentYear - 25) scoreA += 2; // Boost content from last 25 years
    if (bYear > currentYear - 25) scoreB += 2;
    
    return scoreB - scoreA; // Sort in descending order
  });
}

// Check if a search query is appropriate for kids mode
export function isSearchQueryAppropriate(query: string, contentFilter: ContentFilterLevel): boolean {
  if (contentFilter === 'all') return true;
  
  const lowerQuery = query.toLowerCase().trim();
  
  // For kids mode, be very strict
  if (contentFilter === 'kids') {
    const containsAdultKeywords = ADULT_KEYWORDS.some(keyword => 
      lowerQuery.includes(keyword)
    );
    
    const matchesAdultPatterns = ADULT_PATTERNS.some(pattern => 
      pattern.test(lowerQuery)
    );
    
    return !containsAdultKeywords && !matchesAdultPatterns;
  }
  
  // For filtered mode, block obvious adult content
  if (contentFilter === 'filtered') {
    const explicitKeywords = ['porn', 'xxx', 'erotic', 'nude', 'naked', 'sex', 'adult'];
    const containsExplicitContent = explicitKeywords.some(keyword => 
      lowerQuery.includes(keyword)
    );
    
    const explicitPatterns = [
      /\b(porn|xxx|erotic|nude|naked)\b/i,
      /\b(anal|oral)\b/i,
      /\b(fetish|bdsm|kink)\b/i,
      /\b(strip|prostitute)\b/i
    ];
    
    const matchesExplicitPatterns = explicitPatterns.some(pattern => 
      pattern.test(lowerQuery)
    );
    
    return !containsExplicitContent && !matchesExplicitPatterns;
  }
  
  return true;
}

export function getFilterConfig(contentFilter: ContentFilterLevel): FilterConfig {
  switch (contentFilter) {
    case 'all':
      return {
        includeAdult: true, // Show everything including adult content
      };
    
    case 'filtered':
      return {
        includeAdult: false, // Hide explicit adult content but show mature themes
      };
    
    case 'kids':
      return {
        includeAdult: false, // Definitely no adult content
        genreFilter: ADULT_GENRE_IDS, // Filter out violent/scary genres
      };
    
    default:
      return {
        includeAdult: false, // Default to filtered
      };
  }
}

// Filter search results based on content filter level
export function filterSearchResults(results: any[], contentFilter: ContentFilterLevel) {
  if (contentFilter === 'all') {
    return results; // No filtering
  }

  return results.filter((item) => {
    // Basic adult content filtering for both 'filtered' and 'kids'
    if (item.adult === true) {
      return false;
    }
    
    // Use enhanced adult content detection for all filtering levels
    if (isAdultContent(item)) {
      return false;
    }

    // For kids mode, apply additional strict filtering
    if (contentFilter === 'kids') {
      // Check if item has adult genres
      if (item.genre_ids && item.genre_ids.some((id: number) => ADULT_GENRE_IDS.includes(id))) {
        return false;
      }
      
      // For kids mode, only show content with family-friendly genres or no genre info
      if (item.genre_ids && item.genre_ids.length > 0) {
        const hasKidsGenre = item.genre_ids.some((id: number) => KIDS_ALLOWED_GENRES.includes(id));
        if (!hasKidsGenre) {
          return false;
        }
      }
      
      // Filter by rating (if available) - must be well-rated for kids
      if (item.vote_average && item.vote_average < 6.5) {
        return false; // Only show well-rated content for kids
      }
      
      // Filter by release date - prefer newer, family-friendly content
      if (item.release_date || item.first_air_date) {
        const releaseYear = new Date(item.release_date || item.first_air_date).getFullYear();
        if (releaseYear < 1990) {
          return false; // Filter out very old content that might not meet modern standards
        }
      }
    }
    
    // For filtered mode, apply moderate content filtering
    if (contentFilter === 'filtered') {
      // Check if item has explicitly adult genres (but allow some mature themes)
      const explicitlyAdultGenres = [10749]; // Romance is allowed in filtered mode
      if (item.genre_ids && item.genre_ids.some((id: number) => 
        ADULT_GENRE_IDS.includes(id) && !explicitlyAdultGenres.includes(id)
      )) {
        // Allow some genres that were blocked in kids mode
        const allowedInFiltered = [18, 28, 53]; // Drama, Action, Thriller
        const hasAllowedGenre = item.genre_ids.some((id: number) => allowedInFiltered.includes(id));
        if (!hasAllowedGenre) {
          return false;
        }
      }
    }
    
    return true;
  });
}

// Check if content is appropriate for the current filter level
export function isContentAppropriate(
  item: any, 
  contentFilter: ContentFilterLevel
): boolean {
  if (contentFilter === 'all') return true;
  
  if (contentFilter === 'kids') {
    // Strict filtering for kids
    if (item.adult) return false;
    
    if (item.genre_ids) {
      const hasAdultGenres = item.genre_ids.some((id: number) => ADULT_GENRE_IDS.includes(id));
      if (hasAdultGenres) return false;
      
      const hasKidsGenres = item.genre_ids.some((id: number) => KIDS_ALLOWED_GENRES.includes(id));
      if (item.genre_ids.length > 0 && !hasKidsGenres) return false;
    }
    
    // Rating threshold for kids content
    if (item.vote_average && item.vote_average < 5.5) return false;
  }
  
  if (contentFilter === 'filtered') {
    // Basic adult content filtering
    if (item.adult) return false;
  }
  
  return true;
}
