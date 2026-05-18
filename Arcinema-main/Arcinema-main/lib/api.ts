// lib/api.ts
import axios from 'axios';
import { getAllBlockedContent } from '@/lib/firebase/blockedContent';

const BASE_URL = 'https://api.themoviedb.org/3';
const ACCESS_TOKEN = process.env.NEXT_PUBLIC_TMDB_API_READ_ACCESS_TOKEN;

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    Authorization: `Bearer ${ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  },
});

// Add response interceptor to filter blocked content automatically
api.interceptors.response.use(async (response) => {
  // Only filter if response has results array
  if (response.data && response.data.results && Array.isArray(response.data.results)) {
    const blockedMap = await getAllBlockedContent();
    
    const originalCount = response.data.results.length;
    
    response.data.results = response.data.results.filter((item: any) => {
      // Determine media type from the item or endpoint
      let mediaType = item.media_type;
      
      if (!mediaType) {
        // Infer from endpoint URL
        const url = response.config.url || '';
        if (url.includes('/movie')) mediaType = 'movie';
        else if (url.includes('/tv')) mediaType = 'tv';
        else mediaType = 'movie'; // default
      }
      
      const key = `${mediaType}_${item.id}`;
      const isBlocked = blockedMap.has(key);
      
      if (isBlocked) {
      }
      
      return !isBlocked;
    });
    
    const filteredCount = response.data.results.length;
    if (filteredCount < originalCount) {
    }
  }
  
  return response;
}, (error) => {
  return Promise.reject(error);
});

export const fetchTrendingMovies = async (includeAdult: boolean = false, country?: string) => {
  const params: any = {
    include_adult: includeAdult,
  };
  
  if (country && country !== 'all') {
    params.region = country;
  }
  
  const response = await api.get('/trending/movie/week', { params });
  return response.data;
};

export const fetchMoviesByGenre = async (genreId: string, includeAdult: boolean = false, country?: string) => {
  const params: any = {
    with_genres: genreId,
    include_adult: includeAdult,
  };
  
  if (country && country !== 'all') {
    params.region = country;
  }
  
  const response = await api.get('/discover/movie', { params });
  return response.data;
};

export const searchMovies = async (query: string, includeAdult: boolean = false, country?: string, page: number = 1) => {
  const params: any = {
    query,
    include_adult: includeAdult,
    page,
  };
  
  if (country && country !== 'all') {
    params.region = country;
  }
  
  const response = await api.get('/search/movie', { params });
  return response.data;
};

export const searchTVShows = async (query: string, includeAdult: boolean = false, country?: string, page: number = 1) => {
  const params: any = {
    query,
    include_adult: includeAdult,
    page,
  };
  
  if (country && country !== 'all') {
    params.region = country;
  }
  
  const response = await api.get('/search/tv', { params });
  return response.data;
};

export const searchPeople = async (query: string, includeAdult: boolean = false, page: number = 1) => {
  const params: any = {
    query,
    include_adult: includeAdult,
    page,
  };
  
  const response = await api.get('/search/person', { params });
  
  // Filter out blocked persons
  try {
    const { getGloballyBlockedPersons } = await import('@/lib/firebase/contentFilter');
    const blockedPersons = await getGloballyBlockedPersons();
    
    if (response.data?.results) {
      response.data.results = response.data.results.filter((person: any) => 
        !blockedPersons.has(person.id)
      );
    }
  } catch (error) {
  }
  
  return response.data;
};

// Get movie videos (trailers, teasers, etc.)
export const getMovieVideos = async (movieId: number) => {
  const response = await api.get(`/movie/${movieId}/videos`);
  return response.data;
};

// Get TV show videos
export const getTVVideos = async (tvId: number) => {
  const response = await api.get(`/tv/${tvId}/videos`);
  return response.data;
};

// Get movie details with videos
export const getMovieDetails = async (movieId: number, includeAdult: boolean = false) => {
  const params: any = {
    append_to_response: 'videos,credits,similar',
    include_adult: includeAdult,
  };
  
  const response = await api.get(`/movie/${movieId}`, { params });
  return response.data;
};

// Get TV show details with videos
export const getTVDetails = async (tvId: number, includeAdult: boolean = false) => {
  const params: any = {
    append_to_response: 'videos,credits,similar',
    include_adult: includeAdult,
  };
  
  const response = await api.get(`/tv/${tvId}`, { params });
  return response.data;
};

// Get TV shows airing today
export const fetchTVAiringToday = async (includeAdult: boolean = false, country?: string) => {
  const params: any = {
    include_adult: includeAdult,
  };
  
  if (country && country !== 'all') {
    params.region = country;
  }
  
  const response = await api.get('/tv/airing_today', { params });
  return response.data;
};

// Get TV shows on the air (airing in the next 7 days)
export const fetchTVOnTheAir = async (includeAdult: boolean = false, country?: string) => {
  const params: any = {
    include_adult: includeAdult,
  };
  
  if (country && country !== 'all') {
    params.region = country;
  }
  
  const response = await api.get('/tv/on_the_air', { params });
  return response.data;
};

// Get popular TV shows
export const fetchPopularTVShows = async (includeAdult: boolean = false, country?: string) => {
  const params: any = {
    include_adult: includeAdult,
  };
  
  if (country && country !== 'all') {
    params.region = country;
  }
  
  const response = await api.get('/tv/popular', { params });
  return response.data;
};

// Get top rated TV shows
export const fetchTopRatedTVShows = async (includeAdult: boolean = false, country?: string) => {
  const params: any = {
    include_adult: includeAdult,
  };
  
  if (country && country !== 'all') {
    params.region = country;
  }
  
  const response = await api.get('/tv/top_rated', { params });
  return response.data;
};

// lib/types.ts
export interface Movie {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string;
  backdrop_path?: string;
  profile_path?: string;
  overview?: string;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
  genre_ids?: number[];
  media_type?: 'movie' | 'tv' | 'person' | 'anime';
  origin_country?: string[];
  original_language?: string;
  known_for_department?: string;
  known_for?: any[];
  adult?: boolean;
  runtime?: number;
  director?: string;
  cast?: string[];
}

export interface MovieResponse {
  results: Movie[];
  total_pages: number;
  total_results: number;
}

// Import anime search functionality
import { searchAnime } from './features/media/jikanApi';

export { searchAnime };