// types/person.ts
export interface PersonCredits {
    id: number;
    cast: Array<{
      id: number;
      name: string;
      title: string;
      character: string;
      poster_path: string | null;
      media_type: 'movie' | 'tv';
      first_air_date?: string;
      release_date?: string;
    }>;
  }