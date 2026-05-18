// lib/cineai/functionTools.ts
// OpenAI function calling tools for MovieVerse Assistant

export const functionTools = [
  {
    type: "function" as const,
    function: {
      name: "get_current_date",
      description: "Get the current date and time. Use this when user asks about today's date, current year, or what time it is.",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "search_movies_by_theme",
      description: "Search for movies by GENRE or theme (action, horror, romance, comedy, thriller, sci-fi, drama, etc.). CRITICAL: Use this for genre queries like 'action movies', 'horror films', 'sci-fi thriller'. This searches by GENRE CATEGORY, not by word in title. DO NOT use search_movies_by_query for genre words - that searches for the word in the title.",
      parameters: {
        type: "object",
        properties: {
          themeQuery: {
            type: "string",
            description: "The genre or theme (e.g., 'action', 'horror', 'romance', 'sci-fi thriller', 'comedy')"
          },
          year: {
            type: "number", 
            description: "Optional year filter (e.g., 2024, 2023)"
          }
        },
        required: ["themeQuery"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_similar_movies",
      description: "Get movies similar to a specific movie. Use this when user asks for 'movies like X', 'similar to X', 'recommendations based on X', or 'if I liked X'. This uses TMDB's recommendation algorithm.",
      parameters: {
        type: "object",
        properties: {
          movieTitle: {
            type: "string",
            description: "The title of the movie to find similar movies for (e.g., 'Inception', 'The Dark Knight')"
          }
        },
        required: ["movieTitle"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "search_movies_by_query",
      description: "Search for movies by title, keywords, or general query. Use this when user asks for specific movies or searches.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query (movie title, keywords, etc.)"
          },
          year: {
            type: "number", 
            description: "Optional year filter (e.g., 2024, 2023)"
          },
          genre: {
            type: "string",
            description: "Optional genre filter (e.g., action, comedy, drama)"
          }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "discover_movies_by_year", 
      description: "Discover popular movies from a specific year. Use this when user asks for movies from a particular year (e.g., 2024 movies, 2023 releases).",
      parameters: {
        type: "object",
        properties: {
          year: {
            type: "number",
            description: "The release year (e.g., 2024, 2023)"
          },
          genre: {
            type: "string", 
            description: "Optional genre filter (e.g., action, comedy, drama)"
          }
        },
        required: ["year"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "search_christian_movies",
      description: "Search for Christian, faith-based, and religious movies. Use this when user asks for 'Christian movies', 'faith-based films', 'religious movies', 'inspirational Christian stories', etc. This function searches for known Christian movie titles like God's Not Dead, The Passion of the Christ, Heaven is for Real, and others.",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_trending_movies",
      description: "Get currently trending movies. Use this when user asks for trending, popular, or current movies.",
      parameters: {
        type: "object",
        properties: {
          timeWindow: {
            type: "string",
            enum: ["day", "week"],
            description: "Time window for trending movies"
          }
        }
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_popular_movies", 
      description: "Get the most popular movies overall. Use this for general popularity requests.",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_user_watchlist",
      description: "Get the user's current watchlist. Use this when user asks about their watchlist, my list, or what movies they saved.",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_user_favorites",
      description: "Get the user's favorite/liked movies. Use this when user asks about their favorites, liked movies, or saved preferences.",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_user_watch_history",
      description: "Get the user's watch history - movies and TV shows they have already watched. Use this when user asks 'what have I watched', 'my watch history', 'movies I've seen', or 'show my watched movies'. This is DIFFERENT from watchlist (movies they want to watch).",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_user_stats",
      description: "Get user statistics including watchlist count, favorites count, and recently viewed. Use when user asks for overview of their activity.",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_user_notifications",
      description: "Get user's notifications including new releases, updates, and alerts. Use when user asks about notifications, alerts, 'what's new', 'check my notifications', or 'what's in my notifications'. Returns both read and unread notifications with movie data.",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_user_folders",
      description: "Get user's custom folders/collections. Use when user asks 'how many folders do I have', 'show my folders', 'what folders do I have', 'list my collections', 'what's in my folder', 'show me my folder'. Returns list of folder names and movie counts. If they ask 'what's in my folder' without specifying which one, call this first to show available folders.",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_folder_contents",
      description: "Get movies from a specific folder/collection. Use when user asks about a specific folder like 'show movies in [folder name]', 'what's in my [folder name] folder', 'movies from [folder]'. Must be used after get_user_folders to know available folder names.",
      parameters: {
        type: "object",
        properties: {
          folderId: {
            type: "string",
            description: "The ID of the folder to get movies from (get from get_user_folders result)"
          },
          folderName: {
            type: "string",
            description: "The name of the folder (for display purposes)"
          }
        },
        required: ["folderId", "folderName"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "add_to_watchlist",
      description: "Add a movie or TV show to user's watchlist. Use this when user asks to add something to their watchlist, save for later, or add to their list. IMPORTANT: You must get all the movie data (ID, poster_path, release_date) from the RECENT CONTEXT section of the system prompt.",
      parameters: {
        type: "object",
        properties: {
          movieId: {
            type: "number",
            description: "The TMDB ID of the movie or TV show (get from RECENT CONTEXT)"
          },
          title: {
            type: "string", 
            description: "The title of the movie or TV show"
          },
          mediaType: {
            type: "string",
            enum: ["movie", "tv"],
            description: "Whether this is a movie or TV show (get from RECENT CONTEXT)"
          },
          posterPath: {
            type: "string",
            description: "The poster path from TMDB (get from RECENT CONTEXT, e.g., '/abc123.jpg')"
          },
          releaseDate: {
            type: "string",
            description: "The release date in YYYY-MM-DD format (get from RECENT CONTEXT)"
          }
        },
        required: ["movieId", "title", "mediaType", "posterPath", "releaseDate"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "remove_from_watchlist",
      description: "Remove a movie or TV show from user's watchlist. Use this when user asks to remove something from their watchlist or delete from their list. IMPORTANT: You must get all the movie data (ID, poster_path, release_date) from the RECENT CONTEXT section of the system prompt.",
      parameters: {
        type: "object",
        properties: {
          movieId: {
            type: "number",
            description: "The TMDB ID of the movie or TV show (get from RECENT CONTEXT)"
          },
          title: {
            type: "string", 
            description: "The title of the movie or TV show"
          },
          mediaType: {
            type: "string",
            enum: ["movie", "tv"],
            description: "Whether this is a movie or TV show (get from RECENT CONTEXT)"
          },
          posterPath: {
            type: "string",
            description: "The poster path from TMDB (get from RECENT CONTEXT)"
          },
          releaseDate: {
            type: "string",
            description: "The release date in YYYY-MM-DD format (get from RECENT CONTEXT)"
          }
        },
        required: ["movieId", "title", "mediaType", "posterPath", "releaseDate"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "add_to_favorites",
      description: "Add a movie or TV show to user's favorites/likes. Use this when user asks to add something to their favorites, likes, or loved movies. IMPORTANT: You must get all the movie data (ID, poster_path, release_date) from the RECENT CONTEXT section of the system prompt.",
      parameters: {
        type: "object",
        properties: {
          movieId: {
            type: "number",
            description: "The TMDB ID of the movie or TV show (get from RECENT CONTEXT)"
          },
          title: {
            type: "string", 
            description: "The title of the movie or TV show"
          },
          mediaType: {
            type: "string",
            enum: ["movie", "tv"],
            description: "Whether this is a movie or TV show (get from RECENT CONTEXT)"
          },
          posterPath: {
            type: "string",
            description: "The poster path from TMDB (get from RECENT CONTEXT)"
          },
          releaseDate: {
            type: "string",
            description: "The release date in YYYY-MM-DD format (get from RECENT CONTEXT)"
          }
        },
        required: ["movieId", "title", "mediaType", "posterPath", "releaseDate"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "remove_from_favorites",
      description: "Remove a movie or TV show from user's favorites/likes. Use this when user asks to remove something from their favorites or unlike a movie/show. IMPORTANT: You must get all the movie data (ID, poster_path, release_date) from the RECENT CONTEXT section of the system prompt.",
      parameters: {
        type: "object",
        properties: {
          movieId: {
            type: "number",
            description: "The TMDB ID of the movie or TV show (get from RECENT CONTEXT)"
          },
          title: {
            type: "string", 
            description: "The title of the movie or TV show"
          },
          mediaType: {
            type: "string",
            enum: ["movie", "tv"],
            description: "Whether this is a movie or TV show (get from RECENT CONTEXT)"
          },
          posterPath: {
            type: "string",
            description: "The poster path from TMDB (get from RECENT CONTEXT)"
          },
          releaseDate: {
            type: "string",
            description: "The release date in YYYY-MM-DD format (get from RECENT CONTEXT)"
          }
        },
        required: ["movieId", "title", "mediaType", "posterPath", "releaseDate"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_movie_cast",
      description: "Get cast and crew information for a specific movie. Use this when user asks for cast, actors, director, or crew of a movie.",
      parameters: {
        type: "object",
        properties: {
          movieTitle: {
            type: "string",
            description: "The movie title to search for cast information"
          }
        },
        required: ["movieTitle"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_tv_show_cast",
      description: "Get cast and crew information for a specific TV show. Use this when user asks for cast, actors, director, or crew of a TV show.",
      parameters: {
        type: "object",
        properties: {
          tvTitle: {
            type: "string",
            description: "The TV show title to search for cast information"
          }
        },
        required: ["tvTitle"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "search_person",
      description: "Search for an actor, director, or other person by name. Use this when user asks about a person, wants to know who acted in a movie, or wants to find an actor's other work.",
      parameters: {
        type: "object",
        properties: {
          personName: {
            type: "string",
            description: "The name of the person to search for (e.g., 'Tom Holland', 'Taylor Kitsch')"
          }
        },
        required: ["personName"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_movies_by_person",
      description: "Get all movies that a specific person (actor/director) has worked on. Use this when user asks 'what other movies has [actor] been in' or 'show me all movies by [actor]'. IMPORTANT: You must first call search_person to get the person's ID, then call this function with that ID.",
      parameters: {
        type: "object",
        properties: {
          personId: {
            type: "number",
            description: "The TMDB person ID (get this from search_person results first)"
          },
          personName: {
            type: "string",
            description: "The person's name for context"
          }
        },
        required: ["personId", "personName"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_tv_show_videos",
      description: "Get trailers and videos for a specific TV show. Use this when user asks for trailers, videos, or wants to watch TV show previews.",
      parameters: {
        type: "object",
        properties: {
          tvTitle: {
            type: "string",
            description: "The TV show title to search for videos"
          }
        },
        required: ["tvTitle"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_movie_details",
      description: "Get detailed information about a specific movie including plot, runtime, genres, and more. Use this when user asks for plot, story, details, or summary of a movie.",
      parameters: {
        type: "object",
        properties: {
          movieTitle: {
            type: "string",
            description: "The movie title to get details for"
          }
        },
        required: ["movieTitle"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_tv_show_details",
      description: "Get detailed information about a specific TV show including plot/overview, genres, air dates, and more. Use this when user asks for description, plot, story, details, or summary of a TV show or series.",
      parameters: {
        type: "object",
        properties: {
          tvShowTitle: {
            type: "string",
            description: "The TV show title to get details for"
          }
        },
        required: ["tvShowTitle"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_movie_videos",
      description: "Get trailers and videos for a specific movie. Use this when user asks for trailers, videos, or wants to watch movie previews.",
      parameters: {
        type: "object",
        properties: {
          movieTitle: {
            type: "string",
            description: "The movie title to search for videos"
          }
        },
        required: ["movieTitle"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "search_tv_shows",
      description: "Search for TV shows by title or keywords. Use this when user specifically asks for TV shows or series.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The TV show search query (show title, keywords, etc.)"
          },
          year: {
            type: "number", 
            description: "Optional first air date year filter (e.g., 2024, 2023)"
          }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_trending_tv_shows",
      description: "Get currently trending TV shows. Use this when user asks for trending TV shows or popular series.",
      parameters: {
        type: "object",
        properties: {
          timeWindow: {
            type: "string",
            enum: ["day", "week"],
            description: "Time window for trending TV shows"
          }
        }
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "smart_search",
      description: "Search both movies and TV shows intelligently. Use this when user asks general entertainment questions without specifying movies or TV shows.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query for movies and TV shows"
          },
          year: {
            type: "number", 
            description: "Optional year filter"
          }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_top_box_office",
      description: "Get current top box office movies. Use when user asks about box office, highest-grossing movies, or what's making money at theaters.",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_top_indian_movies",
      description: "Get top-rated Indian/Bollywood movies. Use when user asks for Indian movies, Bollywood, or mentions Indian cinema.",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_upcoming_indian_movies",
      description: "Get upcoming Indian/Bollywood movie releases. Use when user asks for upcoming Indian movies or new Bollywood releases.",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_upcoming_releases",
      description: "Get upcoming movie/TV releases by country. Use when user asks about upcoming releases, what's coming soon, or new releases in a specific country.",
      parameters: {
        type: "object",
        properties: {
          countryCode: {
            type: "string",
            description: "Country code (e.g., 'US', 'GB', 'IN', 'FR', 'DE', 'JP', 'KR'). Default is 'US'"
          },
          type: {
            type: "string",
            enum: ["MOVIE", "TV"],
            description: "Type of content - MOVIE or TV. Default is MOVIE"
          }
        }
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "search_imdb_advanced",
      description: "Advanced IMDb search with genre filters. Use when user wants to search by genre or needs IMDb-specific data.",
      parameters: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["movie", "tv", "person"],
            description: "Type of search - movie, tv, or person"
          },
          genre: {
            type: "string",
            description: "Genre filter (e.g., 'Drama', 'Comedy', 'Action', 'Horror', 'Thriller')"
          }
        },
        required: ["type"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_cast_filmography",
      description: "Get all movies/shows a specific actor/cast member has been in. Use when user asks about an actor's filmography or 'what else has [actor] been in'.",
      parameters: {
        type: "object",
        properties: {
          castId: {
            type: "string",
            description: "IMDb cast ID (e.g., 'nm0000190' for Brad Pitt). Must be in format 'nm' followed by numbers."
          },
          castName: {
            type: "string",
            description: "Actor/cast member name for reference"
          }
        },
        required: ["castId", "castName"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "where_to_watch",
      description: "Find where to watch a specific movie or show (streaming services, rent, buy options). Use when user asks 'where can I watch', 'where to stream', or 'is it available'.",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Movie or show title (e.g., 'Inception', 'Breaking Bad')"
          },
          country: {
            type: "string",
            description: "Country code (e.g., 'us', 'uk', 'ca'). Default is 'us'"
          },
          type: {
            type: "string",
            enum: ["movie", "tv"],
            description: "Content type - movie or tv. Default is movie"
          }
        },
        required: ["title"]
      }
    }
  },
  {
    type: "function" as const,
    function: {
      name: "get_tmdb_list",
      description: "Get a curated TMDB list/collection (Marvel Universe, DC Universe, James Bond, Harry Potter, Star Wars, etc). Use when user asks for specific franchises or curated collections.",
      parameters: {
        type: "object",
        properties: {
          listId: {
            type: "number",
            description: "TMDB List ID. Popular IDs: 1=Marvel Universe, 3=DC Universe, 645=James Bond, 99=Harry Potter, 8136=Star Wars, 338=Disney Animated, 3700=Pixar, 10=Studio Ghibli"
          },
          page: {
            type: "number",
            description: "Page number (default: 1)"
          }
        },
        required: ["listId"]
      }
    }
  }
];
