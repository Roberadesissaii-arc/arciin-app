import { filterTMDBResponse, filterMediaArray } from '@/lib/firebase/contentFilter';

// Wrapper for TMDB API fetch calls that automatically filters blocked content
export const fetchTMDBWithFilter = async (
  url: string,
  mediaType: 'movie' | 'tv' | 'anime' = 'movie',
  options?: RequestInit
): Promise<any> => {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Filter the response if it contains results
    if (data.results) {
      return await filterTMDBResponse(data, mediaType);
    }
    
    // For single item responses, check if blocked
    if (data.id) {
      const { isContentBlocked } = await import('@/lib/firebase/contentFilter');
      const blocked = await isContentBlocked(data.id, mediaType);
      if (blocked) {
        // Return null or empty response for blocked content
        return null;
      }
    }
    
    // Filter nested recommendations if they exist
    if (data.recommendations?.results) {
      const filteredRecs = await filterMediaArray(data.recommendations.results, mediaType);
      data.recommendations = {
        ...data.recommendations,
        results: filteredRecs
      };
    }
    
    return data;
  } catch (error) {
    throw error;
  }
};

// Helper to get filtered recommendations
export const getFilteredRecommendations = async (
  id: number, 
  mediaType: 'movie' | 'tv',
  apiKey: string
): Promise<any[]> => {
  const endpoint = mediaType === 'movie' ? 'movie' : 'tv';
  const url = `https://api.themoviedb.org/3/${endpoint}/${id}/recommendations?api_key=${apiKey}`;
  
  try {
    const response = await fetchTMDBWithFilter(url, mediaType, {
      headers: {
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_TMDB_API_READ_ACCESS_TOKEN}`,
      },
    });
    
    return response?.results || [];
  } catch (error) {
    return [];
  }
};

// Helper to filter existing API responses
export const filterAPIResponse = async (
  apiResponse: any,
  mediaType: 'movie' | 'tv' | 'anime' = 'movie'
): Promise<any> => {
  if (!apiResponse) return apiResponse;
  
  // Handle paginated results
  if (apiResponse.results) {
    return await filterTMDBResponse(apiResponse, mediaType);
  }
  
  // Handle arrays directly
  if (Array.isArray(apiResponse)) {
    return await filterMediaArray(apiResponse, mediaType);
  }
  
  // Handle single items with recommendations
  if (apiResponse.recommendations?.results) {
    const filteredRecs = await filterMediaArray(apiResponse.recommendations.results, mediaType);
    return {
      ...apiResponse,
      recommendations: {
        ...apiResponse.recommendations,
        results: filteredRecs
      }
    };
  }
  
  return apiResponse;
};