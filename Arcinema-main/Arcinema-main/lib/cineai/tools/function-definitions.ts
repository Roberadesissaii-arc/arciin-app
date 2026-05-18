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
      description: "Search for movies by GENRE or theme (action, horror, romance, comedy, thriller, sci-fi, drama, etc.). CRITICAL: Use this for genre queries like 'action movies', 'horror films', 'romantic drama', 'sci-fi thriller', 'slow romantic drama', 'romance with deep storyline'. Also use this for MOOD-BASED queries: 'feel-good movie' → use themeQuery='comedy' or 'drama', 'movie to relax with' → use themeQuery='comedy' or 'drama', 'relaxing movie' → use themeQuery='drama' or 'comedy'. This searches by GENRE CATEGORY, not by word in title. DO NOT use search_movies_by_query for genre words - that searches for the word in the title. When user asks for 'romantic drama', 'slow romantic drama', 'romance with deep storyline', 'feel-good movie', 'movie to relax', or similar genre/mood-based queries, ALWAYS use this function. ALWAYS respond with results - never leave blank!",
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
      description: "Get movies similar to a specific movie using TMDB's official recommendations API. CRITICAL: Use this IMMEDIATELY when user asks 'Find me similar movie to [Movie]', 'movies like [Movie]', 'similar to [Movie]', 'recommendations based on [Movie]', 'if I liked [Movie]', 'show me movies similar to [Movie]', or 'what movies are like [Movie]'. Extract the movie title from the query (e.g., 'Find me similar movie to Spider-man' → 'Spider-man'). This uses TMDB's sophisticated recommendation algorithm that considers user ratings, viewing patterns, and movie similarity. Returns 20 highly relevant recommendations sorted by TMDB's algorithm. This creates connections: Movie → Similar Movies. You can chain further: Get cast of similar movies to find shared actors, or get details of similar movies to explain why they're similar.",
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
      description: "Discover popular and top-rated movies from a specific year. Use this when user asks for 'top movies from [year]', 'best movies from [year]', 'popular movies from [year]', or '[genre] movies from [year]'. This function returns movies sorted by popularity and rating. You can filter by genre using the genre parameter. Examples: 'top sci-fi movies from 2024' → discover_movies_by_year(2024, genre='sci-fi'), 'best action movies 2024' → discover_movies_by_year(2024, genre='action').",
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
      description: "Get movies from a specific folder/collection. Use when user asks 'show movies in [folder name]', 'what's in my [folder name] folder', 'what's in that folder', 'show me that folder'. If user says 'that folder', use the folder name from recent context. Both folderId and folderName can be the same (the folder's name) - the function finds folders by name. IMPORTANT: If user says 'both' or 'all folders', call this function MULTIPLE TIMES (once for each folder name from the previous context). For example, if they have folders 'test' and 'sifi', call get_folder_contents twice: once with folderId='test', folderName='test' and again with folderId='sifi', folderName='sifi'.",
      parameters: {
        type: "object",
        properties: {
          folderId: {
            type: "string",
            description: "The ID or name of the folder to get movies from. Can use folder name if ID unknown."
          },
          folderName: {
            type: "string",
            description: "The name of the folder (for display purposes). If user says 'that folder', extract from recent context."
          }
        },
        required: ["folderId", "folderName"]
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
      description: "Gets the cast and crew information (actors, directors, characters) for a specific movie. This function is used when the user wants to know WHO is in a movie, WHO acted in it, or WHO directed it. Examples of when to use this function: 'give me the cast list for Barbie', 'show me cast for Inception', 'cast list for The Dark Knight', 'who's in Oppenheimer', 'cast of Interstellar', 'actors in La La Land', 'list the cast', 'show cast members', 'who stars in Avatar', 'who played the villain in [Movie]'. IMPORTANT: This function is ONLY for getting cast/actor information. DO NOT use this for streaming provider queries like 'where can I watch' or 'where to stream' - use where_to_watch() for those. The results include actor names, character names, actor IDs, and profile images. After getting cast, you can chain to search_person() to get actor details or get_movies_by_person() to find their other movies.",
      parameters: {
        type: "object",
        properties: {
          movieTitle: {
            type: "string",
            description: "The exact movie title to get cast information for. Examples: 'Barbie', 'The Dark Knight', 'Inception', 'Oppenheimer'. Do not include the year unless it's part of the official title (e.g., 'Barbie' not 'Barbie 2023')."
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
      description: "Get cast and crew information for a specific TV show. Use this when user asks for cast, actors, director, or crew of a TV show. IMPORTANT: Awards shows (like AVN Awards, Oscars, Grammys) are TV shows - use this to get people involved in awards shows. First search for the awards show using search_tv_shows(), then call this function with the TV show title.",
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
      description: "Searches for an actor, director, producer, or any person in the entertainment industry by their name. This function is used when the user wants to know WHO a person is, their biography, or information about them. Examples of when to use this function: 'Who is Leonardo DiCaprio?', 'who is Christopher Nolan', 'Tell me about Emma Stone', 'What do you know about Tom Holland?', 'who is Kylie Rocket', 'who is Cory Chase', 'show me Joanna Angel'. This is the STARTING POINT for all person-related queries. The results include the person's ID (needed for other functions), name, biography, birthday, place of birth, known_for_department (e.g., 'Acting', 'Directing'), and profile image. IMPORTANT COMPOSITIONAL RULE: If the user asks about a person's work (e.g., 'show me all work of [Name]', 'list all movies by [Name]', 'filmography of [Name]', 'show me all films directed by [Name]'), you MUST AUTO-CHAIN: First call search_person() to get the person ID, then IMMEDIATELY call get_movies_by_person(personId, personName) in the same response to show their complete filmography. DO NOT stop after just showing the person bio - ALWAYS chain to get_movies_by_person() when user asks about their work! ALWAYS call this function for 'who is' queries - never leave blank!",
      parameters: {
        type: "object",
        properties: {
          personName: {
            type: "string",
            description: "The full name of the person to search for. Examples: 'Leonardo DiCaprio', 'Christopher Nolan', 'Emma Stone', 'Tom Holland', 'Kylie Rocket', 'Cory Chase'. Use the person's professional name as it appears in credits. If the user asks 'who is [Name]', extract just the name part (e.g., 'who is Tom Holland' → 'Tom Holland')."
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
      description: "Gets ALL movies AND TV shows that a specific person (actor, director, producer, etc.) has worked on. This function is used when the user wants to see a person's complete filmography, all their movies, or all their work. Examples of when to use this function: 'show me her movies', 'list all her work', 'show me his movies', 'show her filmography', 'show all his work', 'what other movies has Leonardo DiCaprio been in', 'show me all movies by Emma Stone', 'what movies has Christopher Nolan directed', 'show me all films directed by Christopher Nolan', 'movies directed by [Director Name]', 'What movies has [Actor] acted in recently?'. This function returns BOTH movies AND TV shows (typically 10-20+ items) sorted by quality and popularity. IMPORTANT: To use this function, you need the person's ID. If the person was just discussed in RECENT CONTEXT, extract the person ID from there. Otherwise, you must first call search_person(personName) to get the person's ID, then call this function with that ID. This creates a connection: Person → Movies & TV Shows. After getting results, you can chain further: use get_movie_cast() to find co-stars, or get_similar_movies() to find related content. ALWAYS respond with results and show ALL 10-20+ items with movie posters - never leave blank!",
      parameters: {
        type: "object",
        properties: {
          personId: {
            type: "number",
            description: "The TMDB person ID. You can get this from: (1) search_person() function results (the 'id' field), or (2) RECENT CONTEXT if the person was just discussed. This is a numeric ID like 6193, 525, 5064, etc. Do not use the person's name here - use the numeric ID."
          },
          personName: {
            type: "string",
            description: "The person's full name for context and display purposes. Examples: 'Leonardo DiCaprio', 'Christopher Nolan', 'Emma Stone'. This helps identify which person's filmography is being shown."
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
      description: "Get detailed information about a specific movie including plot, runtime, genres, director, and more. Use this when user asks for plot, story, details, or summary of a movie. This provides the foundation for connections. After getting details, you can chain: get_movie_cast() to find actors, get_similar_movies() to find related content, or search_person() for director/actor details. The details include movie ID, title, overview, genres, release_date, runtime, director, and vote_average.",
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
      description: "Search for TV shows by title or keywords. Use this when user specifically asks for TV shows or series. IMPORTANT: Awards shows (like AVN Awards, Oscars, Grammys, Emmys) are often TV shows/documentaries in TMDB - use this function to search for them when user asks about 'people involved in [Awards Show]' or 'cast of [Awards Show]'.",
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
      description: "Finds where a specific movie or TV show is available to watch, rent, or buy (streaming services like Netflix, Hulu, Disney+, or rental/purchase options). This function is used when the user wants to know WHERE they can watch or stream a movie/show, or which streaming service has it. Examples of when to use this function: 'where can I watch Barbie', 'where to stream Inception', 'is The Dark Knight available on Netflix', 'where is Oppenheimer streaming', 'can I watch Interstellar on Netflix', 'where can I rent La La Land'. IMPORTANT: This function is ONLY for streaming provider/availability queries. DO NOT use this for cast queries like 'cast list for', 'who's in', 'actors in', 'show me the cast' - use get_movie_cast() for those instead! This function works for SPECIFIC movie/show titles only. You cannot search for 'movies on Netflix' - instead, search by genre first, then check where_to_watch() for specific titles. Always respond with results - never leave blank!",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "The exact movie or TV show title to check availability for. Examples: 'Barbie', 'Inception', 'Breaking Bad', 'The Dark Knight'. Do not include the year unless it's part of the official title."
          },
          country: {
            type: "string",
            description: "The country code to check availability in. Examples: 'us' for United States, 'uk' for United Kingdom, 'ca' for Canada. Default is 'us' if not specified."
          },
          type: {
            type: "string",
            enum: ["movie", "tv"],
            description: "The content type - either 'movie' for films or 'tv' for television shows. Default is 'movie' if not specified."
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
  },
  {
    type: "function" as const,
    function: {
      name: "web_search_movies",
      description: "Search the web for factual information, awards, news, reviews, release dates, or any information not available in the movie database. CRITICAL: Use this when user asks about: awards (Oscars, Golden Globes, etc.), box office numbers, specific factual information about movies, current events, recent announcements, release dates, or real-time information. Examples: 'What awards did Oppenheimer win?', 'How much did Avatar make at box office?', 'When is Dune 3 releasing?', 'What did critics say about Barbie?'. This function searches the internet for up-to-date, factual information.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query for factual information (e.g., 'Oppenheimer awards won', 'Avatar box office revenue', 'Dune 3 release date', 'Barbie movie reviews')"
          },
          maxResults: {
            type: "number",
            description: "Maximum number of results to return (default 3, max 5)"
          }
        },
        required: ["query"]
      }
    }
  }
];
