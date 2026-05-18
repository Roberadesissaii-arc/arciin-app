// lib/jikanApi.ts
"use client";

const JIKAN_BASE_URL = 'https://api.jikan.moe/v4';

// Rate limiting: 3 requests per second, 60 per minute
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 334; // ~3 requests per second

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const makeRequest = async (url: string) => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await delay(MIN_REQUEST_INTERVAL - timeSinceLastRequest);
  }
  
  lastRequestTime = Date.now();
  
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      if (response.status === 429) {
        // Rate limited, wait longer
        await delay(2000);
        return makeRequest(url);
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    throw error;
  }
};

export interface JikanAnime {
  mal_id: number;
  url: string;
  images: {
    jpg: {
      image_url: string;
      small_image_url: string;
      large_image_url: string;
    };
    webp: {
      image_url: string;
      small_image_url: string;
      large_image_url: string;
    };
  };
  trailer: {
    youtube_id: string | null;
    url: string | null;
    embed_url: string | null;
  };
  title: string;
  title_english: string | null;
  title_japanese: string | null;
  type: 'TV' | 'Movie' | 'OVA' | 'Special' | 'ONA' | 'Music';
  source: string;
  episodes: number | null;
  status: 'Finished Airing' | 'Currently Airing' | 'Not yet aired';
  airing: boolean;
  duration: string;
  rating: string;
  score: number | null;
  scored_by: number;
  rank: number | null;
  popularity: number;
  synopsis: string | null;
  season: 'winter' | 'spring' | 'summer' | 'fall' | null;
  year: number | null;
  genres: Array<{
    mal_id: number;
    type: string;
    name: string;
    url: string;
  }>;
  studios: Array<{
    mal_id: number;
    type: string;
    name: string;
    url: string;
  }>;
}

export interface JikanResponse<T> {
  data: T;
  pagination?: {
    last_visible_page: number;
    has_next_page: boolean;
    current_page: number;
    items: {
      count: number;
      total: number;
      per_page: number;
    };
  };
}

// Get trending anime (top airing)
export const getTrendingAnime = async (page: number = 1): Promise<JikanResponse<JikanAnime[]>> => {
  const url = `${JIKAN_BASE_URL}/top/anime?filter=airing&page=${page}&limit=25`;
  return makeRequest(url);
};

// Get popular anime (top by popularity)
export const getPopularAnime = async (page: number = 1): Promise<JikanResponse<JikanAnime[]>> => {
  const url = `${JIKAN_BASE_URL}/top/anime?filter=bypopularity&page=${page}&limit=25`;
  return makeRequest(url);
};

// Get top rated anime
export const getTopRatedAnime = async (page: number = 1): Promise<JikanResponse<JikanAnime[]>> => {
  const url = `${JIKAN_BASE_URL}/top/anime?page=${page}&limit=25`;
  return makeRequest(url);
};

// Get upcoming anime
export const getUpcomingAnime = async (page: number = 1): Promise<JikanResponse<JikanAnime[]>> => {
  const url = `${JIKAN_BASE_URL}/top/anime?filter=upcoming&page=${page}&limit=25`;
  return makeRequest(url);
};

// Get anime movies
export const getAnimeMovies = async (page: number = 1): Promise<JikanResponse<JikanAnime[]>> => {
  const url = `${JIKAN_BASE_URL}/anime?type=movie&order_by=score&sort=desc&page=${page}&limit=25`;
  return makeRequest(url);
};

// Get current season anime
export const getCurrentSeasonAnime = async (page: number = 1): Promise<JikanResponse<JikanAnime[]>> => {
  const currentDate = new Date();
  const year = currentDate.getFullYear();
  let season: string;
  
  const month = currentDate.getMonth() + 1; // getMonth() returns 0-11
  if (month >= 12 || month <= 2) season = 'winter';
  else if (month >= 3 && month <= 5) season = 'spring';
  else if (month >= 6 && month <= 8) season = 'summer';
  else season = 'fall';
  
  const url = `${JIKAN_BASE_URL}/seasons/${year}/${season}?page=${page}&limit=25`;
  return makeRequest(url);
};

// Search anime
export const searchAnime = async (
  query: string,
  page: number = 1,
  options: {
    type?: 'tv' | 'movie' | 'ova' | 'special' | 'ona' | 'music';
    status?: 'airing' | 'complete' | 'upcoming';
    rating?: 'g' | 'pg' | 'pg13' | 'r17' | 'r' | 'rx';
    score?: number;
    genres?: string;
    order_by?: 'mal_id' | 'title' | 'start_date' | 'end_date' | 'episodes' | 'score' | 'scored_by' | 'rank' | 'popularity';
    sfw?: boolean;
  } = {}
): Promise<JikanResponse<JikanAnime[]>> => {
  const params = new URLSearchParams();
  params.append('q', query);
  params.append('page', page.toString());
  params.append('limit', '25');
  
  if (options.type) params.append('type', options.type);
  if (options.status) params.append('status', options.status);
  if (options.rating) params.append('rating', options.rating);
  if (options.score) params.append('min_score', options.score.toString());
  if (options.genres) params.append('genres', options.genres);
  if (options.order_by) params.append('order_by', options.order_by);
  if (options.sfw !== undefined) params.append('sfw', options.sfw.toString());
  
  const url = `${JIKAN_BASE_URL}/anime?${params.toString()}`;
  return makeRequest(url);
};

// Get anime by ID
export const getAnimeById = async (id: number): Promise<JikanResponse<JikanAnime>> => {
  const url = `${JIKAN_BASE_URL}/anime/${id}/full`;
  return makeRequest(url);
};

// Get anime characters
export const getAnimeCharacters = async (id: number) => {
  const url = `${JIKAN_BASE_URL}/anime/${id}/characters`;
  return makeRequest(url);
};

// Get anime recommendations
export const getAnimeRecommendations = async (id: number) => {
  const url = `${JIKAN_BASE_URL}/anime/${id}/recommendations`;
  return makeRequest(url);
};

// Get anime videos
export const getAnimeVideos = async (id: number) => {
  const url = `${JIKAN_BASE_URL}/anime/${id}/videos`;
  return makeRequest(url);
};

// Convert Jikan anime to our internal format for consistency with TMDB
export const convertJikanToInternalFormat = (anime: JikanAnime) => {
  return {
    id: anime.mal_id,
    title: anime.title_english || anime.title,
    name: anime.title_english || anime.title,
    poster_path: anime.images.jpg.large_image_url,
    backdrop_path: anime.images.jpg.large_image_url,
    vote_average: anime.score || 0,
    release_date: anime.year ? `${anime.year}-01-01` : '',
    first_air_date: anime.year ? `${anime.year}-01-01` : '',
    overview: anime.synopsis || '',
    genre_ids: anime.genres.map(g => g.mal_id),
    media_type: 'anime' as const,
    // Additional anime-specific fields
    episodes: anime.episodes,
    status: anime.status,
    rating: anime.rating,
    type: anime.type,
    source: anime.source,
    studios: anime.studios,
    duration: anime.duration,
    mal_id: anime.mal_id,
    mal_url: anime.url,
    trailer_url: anime.trailer.youtube_id ? `https://www.youtube.com/watch?v=${anime.trailer.youtube_id}` : null,
  };
};

// Helper function to get section data
export const getAnimeSectionData = async (section: string, page: number = 1) => {
  let response: JikanResponse<JikanAnime[]>;
  
  switch (section) {
    case 'trending':
    case 'trending_anime':
      response = await getTrendingAnime(page);
      break;
    case 'popular':
    case 'popular_anime':
      response = await getPopularAnime(page);
      break;
    case 'top_rated':
    case 'top_rated_anime':
      response = await getTopRatedAnime(page);
      break;
    case 'upcoming':
    case 'upcoming_anime':
      response = await getUpcomingAnime(page);
      break;
    case 'anime_movies':
      response = await getAnimeMovies(page);
      break;
    case 'current_season':
      response = await getCurrentSeasonAnime(page);
      break;
    default:
      response = await getPopularAnime(page);
  }
  
  return {
    ...response,
    data: response.data.map(convertJikanToInternalFormat)
  };
};
