// lib/cineai/whereToWatchApi.ts
// Where Can I Watch API - Find streaming availability by country

/**
 * Search for where to watch a movie/show by title via API route
 * @param country - Country code (e.g., 'us', 'uk', 'ca', 'au')
 * @param title - Movie or show title
 */
export const searchWhereToWatch = async (
  country: string,
  title: string
): Promise<any> => {
  try {
    const params = new URLSearchParams({
      country,
      title,
      type: 'movie'
    });
    
    const url = `/api/wheretowatch/lookup?${params}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    return null;
  }
};

/**
 * Lookup specific title details with streaming info via API route
 * @param country - Country code (e.g., 'us', 'uk', 'ca', 'au')
 * @param type - 'movie' or 'tv'
 * @param title - Movie or show title
 */
export const lookupTitle = async (
  country: string,
  type: 'movie' | 'tv',
  title: string
): Promise<any> => {
  try {
    const params = new URLSearchParams({
      country,
      type,
      title
    });
    
    const url = `/api/wheretowatch/lookup?${params}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    return null;
  }
};

/**
 * Helper: Format streaming availability for display
 */
export const formatStreamingInfo = (data: any): {
  title: string;
  services: string[];
  rentOptions?: any[];
  buyOptions?: any[];
} => {
  if (!data) return { title: '', services: [] };

  const services = new Set<string>();
  const rentOptions: any[] = [];
  const buyOptions: any[] = [];

  // Extract streaming services
  if (data.streamingInfo) {
    Object.values(data.streamingInfo).forEach((info: any) => {
      if (info.service) services.add(info.service);
      if (info.type === 'rent') rentOptions.push(info);
      if (info.type === 'buy') buyOptions.push(info);
    });
  }

  return {
    title: data.title || data.name || '',
    services: Array.from(services),
    rentOptions: rentOptions.length > 0 ? rentOptions : undefined,
    buyOptions: buyOptions.length > 0 ? buyOptions : undefined
  };
};

/**
 * Helper: Get all available countries
 */
export const SUPPORTED_COUNTRIES = [
  { code: 'us', name: 'United States' },
  { code: 'uk', name: 'United Kingdom' },
  { code: 'ca', name: 'Canada' },
  { code: 'au', name: 'Australia' },
  { code: 'de', name: 'Germany' },
  { code: 'fr', name: 'France' },
  { code: 'in', name: 'India' },
  { code: 'jp', name: 'Japan' },
  { code: 'br', name: 'Brazil' },
  { code: 'mx', name: 'Mexico' }
];
