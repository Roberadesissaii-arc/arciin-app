interface Movie {
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

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  movies?: Movie[];
  timestamp: string;
} 