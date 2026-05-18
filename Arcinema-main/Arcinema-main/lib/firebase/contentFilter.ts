import { projectFirestore as db } from '@/firebase/config';
import { collection, getDocs } from 'firebase/firestore';

// Cache for blocked content to avoid repeated DB queries
let blockedContentCache: Set<string> | null = null;
let blockedPersonsCache: Set<number> | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Get all globally blocked content IDs
export const getGloballyBlockedContent = async (): Promise<Set<string>> => {
  const now = Date.now();
  
  // Return cached data if it's still fresh
  if (blockedContentCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return blockedContentCache;
  }

  try {
    const blockedSet = new Set<string>();
    
    // Get all globally blocked content
    const blockedQuery = collection(db, 'blockedContent');
    const blockedSnapshot = await getDocs(blockedQuery);
    
    blockedSnapshot.forEach((doc) => {
      const data = doc.data();
      // Create content key in format: mediaType_id
      const contentKey = `${data.mediaType}_${data.id}`;
      blockedSet.add(contentKey);
    });

    // Update cache
    blockedContentCache = blockedSet;
    cacheTimestamp = now;
    
    return blockedSet;
  } catch (error) {
    // Return empty set on error to avoid blocking all content
    return new Set<string>();
  }
};

// Get all globally blocked persons
export const getGloballyBlockedPersons = async (): Promise<Set<number>> => {
  const now = Date.now();
  
  // Return cached data if it's still fresh
  if (blockedPersonsCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return blockedPersonsCache;
  }

  try {
    const blockedSet = new Set<number>();
    
    // Get all globally blocked persons
    const blockedQuery = collection(db, 'blockedPersons');
    const blockedSnapshot = await getDocs(blockedQuery);
    
    blockedSnapshot.forEach((doc) => {
      const data = doc.data();
      blockedSet.add(data.id);
    });

    // Update cache
    blockedPersonsCache = blockedSet;
    
    return blockedSet;
  } catch (error) {
    // Return empty set on error to avoid blocking all content
    return new Set<number>();
  }
};

// Clear the cache (call this when content is blocked/unblocked)
export const clearBlockedContentCache = () => {
  blockedContentCache = null;
  blockedPersonsCache = null;
  cacheTimestamp = 0;
};

// Filter a single media item
export const filterMediaItem = (
  item: any, 
  mediaType: 'movie' | 'tv' | 'anime',
  blockedContent: Set<string>
): boolean => {
  if (!item || !item.id) return false;
  
  const contentKey = `${mediaType}_${item.id}`;
  return !blockedContent.has(contentKey);
};

// Check if content features blocked persons (requires TMDB API call)
export const isContentBlockedByPerson = async (
  id: number, 
  mediaType: 'movie' | 'tv' | 'anime'
): Promise<boolean> => {
  try {
    const blockedPersons = await getGloballyBlockedPersons();
    if (blockedPersons.size === 0) return false;

    const API_KEY = process.env.NEXT_PUBLIC_TMDB_API_READ_ACCESS_TOKEN;
    
    if (!API_KEY) {
      return false;
    }
    
    const endpoint = mediaType === 'movie' ? 'movie' : 'tv';
    
    // Fetch cast and crew for the content
    const response = await fetch(
      `https://api.themoviedb.org/3/${endpoint}/${id}/credits`,
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      return false;
    }

    const credits = await response.json();
    
    // Check cast
    if (credits.cast) {
      for (const person of credits.cast) {
        if (blockedPersons.has(person.id)) {
          return true;
        }
      }
    }
    
    // Check crew
    if (credits.crew) {
      for (const person of credits.crew) {
        if (blockedPersons.has(person.id)) {
          return true;
        }
      }
    }
    
    return false;
  } catch (error) {
    return false; // Don't block on error
  }
};

// Filter an array of media items (includes person-based filtering)
export const filterMediaArray = async <T extends { id: number }>(
  items: T[], 
  mediaType: 'movie' | 'tv' | 'anime'
): Promise<T[]> => {
  if (!items || items.length === 0) return items;
  
  try {
    const [blockedContent, blockedPersons] = await Promise.all([
      getGloballyBlockedContent(),
      getGloballyBlockedPersons()
    ]);
    
    // First filter by directly blocked content
    let filtered = items.filter(item => filterMediaItem(item, mediaType, blockedContent));
    
    // If there are blocked persons, also filter by person involvement
    if (blockedPersons.size > 0) {
      const personFilterPromises = filtered.map(async (item) => {
        const isBlocked = await isContentBlockedByPerson(item.id, mediaType);
        return !isBlocked;
      });
      
      const personFilterResults = await Promise.all(personFilterPromises);
      filtered = filtered.filter((_, index) => personFilterResults[index]);
    }
    
    return filtered;
  } catch (error) {
    // Return original array on error to avoid breaking functionality
    return items;
  }
};

// Filter TMDB API response (recommendations, search results, etc.)
export const filterTMDBResponse = async (
  response: any,
  mediaType: 'movie' | 'tv' | 'anime'
): Promise<any> => {
  if (!response || !response.results) return response;
  
  const filteredResults = await filterMediaArray(response.results, mediaType);
  
  return {
    ...response,
    results: filteredResults,
    total_results: filteredResults.length,
    // Keep page info but update total_results to reflect filtered count
  };
};

// Check if a single item is blocked
export const isContentBlocked = async (
  id: number, 
  mediaType: 'movie' | 'tv' | 'anime'
): Promise<boolean> => {
  try {
    const blockedContent = await getGloballyBlockedContent();
    const contentKey = `${mediaType}_${id}`;
    return blockedContent.has(contentKey);
  } catch (error) {
    return false; // Don't block on error
  }
};

// Filter recommendations specifically (commonly used)
export const filterRecommendations = async (
  recommendations: any[], 
  mediaType: 'movie' | 'tv' | 'anime'
): Promise<any[]> => {
  return filterMediaArray(recommendations, mediaType);
};

// Filter search results
export const filterSearchResults = async (
  searchResponse: any,
  defaultMediaType: 'movie' | 'tv' | 'anime' = 'movie'
): Promise<any> => {
  if (!searchResponse || !searchResponse.results) return searchResponse;
  
  try {
    const blockedContent = await getGloballyBlockedContent();
    
    const filteredResults = searchResponse.results.filter((item: any) => {
      // Determine media type from the item or use default
      const mediaType = item.media_type || defaultMediaType;
      return filterMediaItem(item, mediaType, blockedContent);
    });
    
    return {
      ...searchResponse,
      results: filteredResults,
      total_results: filteredResults.length,
    };
  } catch (error) {
    return searchResponse;
  }
};