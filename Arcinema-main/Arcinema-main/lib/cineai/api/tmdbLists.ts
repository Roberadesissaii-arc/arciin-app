// lib/cineai/tmdbLists.ts
// TMDB v4 Lists API - Fetch curated movie/TV collections

const TMDB_ACCESS_TOKEN = process.env.NEXT_PUBLIC_TMDB_API_READ_ACCESS_TOKEN;
const TMDB_API_BASE = 'https://api.themoviedb.org/4';

interface TMDBListItem {
  adult: boolean;
  backdrop_path: string;
  id: number;
  title?: string;
  name?: string;
  original_language: string;
  original_title?: string;
  original_name?: string;
  overview: string;
  poster_path: string;
  media_type: 'movie' | 'tv';
  genre_ids: number[];
  popularity: number;
  release_date?: string;
  first_air_date?: string;
  video?: boolean;
  vote_average: number;
  vote_count: number;
}

interface TMDBListResponse {
  average_rating: number;
  backdrop_path: string;
  results: TMDBListItem[];
  created_by: {
    avatar_path: string;
    gravatar_hash: string;
    id: string;
    name: string;
    username: string;
  };
  description: string;
  id: number;
  iso_3166_1: string;
  iso_639_1: string;
  item_count: number;
  name: string;
  page: number;
  poster_path: string;
  public: boolean;
  revenue: number;
  runtime: number;
  sort_by: string;
  total_pages: number;
  total_results: number;
}

/**
 * Fetch a TMDB curated list by ID
 * @param listId - TMDB list ID (e.g., 1 for "The Marvel Universe")
 * @param language - Language code (default: en-US)
 * @param page - Page number (default: 1)
 */
export const getTMDBList = async (
  listId: number,
  language: string = 'en-US',
  page: number = 1
): Promise<TMDBListResponse | null> => {
  try {
    const url = `${TMDB_API_BASE}/list/${listId}?language=${language}&page=${page}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${TMDB_ACCESS_TOKEN}`,
        'accept': 'application/json'
      }
    });

    if (!response.ok) {
      return null;
    }

    const data: TMDBListResponse = await response.json();
    return data;
  } catch (error) {
    return null;
  }
};

/**
 * Popular TMDB List IDs for quick access
 */
export const POPULAR_TMDB_LISTS = {
  MARVEL_UNIVERSE: 1,
  DC_EXTENDED_UNIVERSE: 3,
  JAMES_BOND: 645,
  HARRY_POTTER: 99,
  STAR_WARS: 8136,
  DISNEY_ANIMATED: 338,
  PIXAR: 3700,
  STUDIO_GHIBLI: 10,
  CRITERION_COLLECTION: 7103670,
  BEST_PICTURE_WINNERS: 28
};

/**
 * Convert TMDB list items to MediaItem format
 */
export const convertListItemsToMediaItems = (items: TMDBListItem[]) => {
  return items.map(item => {
    const isTV = item.media_type === 'tv';
    
    if (isTV) {
      return {
        id: item.id,
        name: item.name || item.original_name || '',
        poster_path: item.poster_path,
        overview: item.overview,
        vote_average: item.vote_average,
        first_air_date: item.first_air_date || '',
        media_type: 'tv' as const
      };
    } else {
      return {
        id: item.id,
        title: item.title || item.original_title || '',
        poster_path: item.poster_path,
        overview: item.overview,
        vote_average: item.vote_average,
        release_date: item.release_date || '',
        media_type: 'movie' as const
      };
    }
  });
};
