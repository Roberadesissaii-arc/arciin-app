// types/ai-chat/index.ts
// Type definitions for MovieVerse AI Chat

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  movies?: MediaItem[];
  videos?: Video[];
  person?: any; // Person details when searching for actors/directors
  timestamp: Date;
  attachedMovie?: MediaItem;
  isOllama?: boolean; // Flag to enable typing animation for Ollama responses
}

export interface Movie {
  id: number;
  /** Present for OMDB-sourced rows; `id` may be an IMDb numeric fragment, not a TMDB id */
  imdb_id?: string;
  omdb_poster?: string | null;
  title: string;
  poster_path: string;
  overview: string;
  vote_average: number;
  release_date: string;
  media_type: 'movie' | 'tv';
  genres?: { id: number; name: string }[];
  cast?: { id: number; name: string; character: string; profile_path: string }[];
  crew?: { id: number; name: string; job: string; profile_path: string }[];
  runtime?: number;
  production_companies?: { id: number; name: string; logo_path: string }[];
  production_countries?: { iso_3166_1: string; name: string }[];
  budget?: number;
  revenue?: number;
  tagline?: string;
  popularity?: number;
  original_language?: string;
}

export interface TVShow {
  id: number;
  name: string;
  poster_path: string;
  overview: string;
  vote_average: number;
  first_air_date: string;
  media_type: 'movie' | 'tv';
  genres?: { id: number; name: string }[];
  origin_country?: string[];
  cast?: { id: number; name: string; character: string; profile_path: string }[];
  crew?: { id: number; name: string; job: string; profile_path: string }[];
}

export interface Person {
  id: number;
  name: string;
  profile_path: string;
  known_for_department?: string;
  media_type: 'person';
  biography?: string;
  birthday?: string;
  place_of_birth?: string;
}

export type MediaItem = Movie | TVShow | Person;

export interface Video {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
  movieTitle: string;
}

export interface UserPreferences {
  watchlist: MediaItem[];
  favorites: MediaItem[];
  recentlyViewed: MediaItem[];
  genres: { id: number; name: string }[];
}
