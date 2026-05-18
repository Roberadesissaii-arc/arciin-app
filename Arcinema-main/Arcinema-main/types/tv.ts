// types/tv.ts
export interface TVShowDetails {
    id: number;
    name: string;
    overview: string;
    backdrop_path: string;
    poster_path: string;
    first_air_date: string;
    last_air_date: string;
    episode_run_time: number[];
    vote_average: number;
    genres: Array<{ id: number; name: string }>;
    number_of_seasons: number;
    number_of_episodes: number;
    status: string;
    tagline: string;
    next_episode_to_air: {
      air_date: string;
      episode_number: number;
      season_number: number;
    } | null;
    networks: Array<{
      id: number;
      name: string;
      logo_path: string;
    }>;
    created_by: Array<{
      id: number;
      name: string;
      profile_path: string | null;
    }>;
    credits: {
      cast: Array<{
        id: number;
        name: string;
        character: string;
        profile_path: string | null;
        known_for_department: string;
      }>;
      crew: Array<{
        id: number;
        name: string;
        job: string;
        department: string;
        profile_path: string | null;
      }>;
    };
    videos: {
      results: Array<{
        id: string;
        key: string;
        name: string;
        type: string;
        site: string;
      }>;
    };
    similar: {
      results: Array<{
        id: number;
        name: string;
        poster_path: string;
        vote_average: number;
        first_air_date: string;
      }>;
    };
  }