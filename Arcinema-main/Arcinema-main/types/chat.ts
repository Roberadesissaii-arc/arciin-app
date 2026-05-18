// 1. Types file (types/chat.ts)
export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    movies?: Movie[];
    timestamp: string;
  }
  
  export interface Movie {
    id: number;
    title: string;
    poster_path: string;
    release_date: string;
    overview: string;
    vote_average: number;
    genre_ids: number[];
  }
  
  export interface UserPreferences {
    favoriteGenres: string[];
    watchlist: Movie[];
    likes: Movie[];
    recentlyViewed: Movie[];
    settings: {
      emailNotifications: boolean;
      darkMode: boolean;
    };
  }
  