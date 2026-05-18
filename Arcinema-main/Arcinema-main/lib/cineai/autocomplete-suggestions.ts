/**
 * Autocomplete suggestions for CineAI chat input
 * Triggered by @ symbol
 */

export interface AutocompleteSuggestion {
  label: string;
  value: string;
  category: 'genre' | 'decade' | 'theme' | 'mood' | 'actor' | 'director' | 'studio' | 'collection';
  description?: string;
}

export const autocompleteSuggestions: AutocompleteSuggestion[] = [
  // Genres
  { label: 'Action', value: 'action movies', category: 'genre', description: 'High-energy action films' },
  { label: 'Adventure', value: 'adventure movies', category: 'genre', description: 'Epic adventures' },
  { label: 'Animation', value: 'animation movies', category: 'genre', description: 'Animated films' },
  { label: 'Comedy', value: 'comedy movies', category: 'genre', description: 'Funny movies' },
  { label: 'Crime', value: 'crime movies', category: 'genre', description: 'Crime thrillers' },
  { label: 'Documentary', value: 'documentary movies', category: 'genre', description: 'Real stories' },
  { label: 'Drama', value: 'drama movies', category: 'genre', description: 'Dramatic films' },
  { label: 'Family', value: 'family movies', category: 'genre', description: 'Family-friendly films' },
  { label: 'Fantasy', value: 'fantasy movies', category: 'genre', description: 'Magical worlds' },
  { label: 'History', value: 'history movies', category: 'genre', description: 'Historical films' },
  { label: 'Horror', value: 'horror movies', category: 'genre', description: 'Scary movies' },
  { label: 'Mystery', value: 'mystery movies', category: 'genre', description: 'Mystery thrillers' },
  { label: 'Romance', value: 'romance movies', category: 'genre', description: 'Love stories' },
  { label: 'Sci-Fi', value: 'sci-fi movies', category: 'genre', description: 'Science fiction' },
  { label: 'Thriller', value: 'thriller movies', category: 'genre', description: 'Suspenseful films' },
  { label: 'War', value: 'war movies', category: 'genre', description: 'War films' },
  { label: 'Western', value: 'western movies', category: 'genre', description: 'Wild West films' },
  
  // Decades
  { label: '2020s', value: 'movies from 2020s', category: 'decade', description: 'Current decade' },
  { label: '2010s', value: 'movies from 2010s', category: 'decade', description: '2010-2019' },
  { label: '2000s', value: 'movies from 2000s', category: 'decade', description: '2000-2009' },
  { label: '1990s', value: 'movies from 1990s', category: 'decade', description: '1990-1999' },
  { label: '1980s', value: 'movies from 1980s', category: 'decade', description: '1980-1989' },
  { label: '1970s', value: 'movies from 1970s', category: 'decade', description: '1970-1979' },
  { label: 'Classic', value: 'classic movies', category: 'decade', description: 'Pre-1970 classics' },
  
  // Themes
  { label: 'Superhero', value: 'superhero movies', category: 'theme', description: 'Marvel, DC, etc.' },
  { label: 'Anime', value: 'anime movies', category: 'theme', description: 'Japanese animation' },
  { label: 'Christmas', value: 'christmas movies', category: 'theme', description: 'Holiday films' },
  { label: 'Halloween', value: 'halloween movies', category: 'theme', description: 'Spooky season' },
  { label: 'Space', value: 'space movies', category: 'theme', description: 'Space exploration' },
  { label: 'Zombie', value: 'zombie movies', category: 'theme', description: 'Undead films' },
  { label: 'Vampire', value: 'vampire movies', category: 'theme', description: 'Vampire stories' },
  { label: 'Time Travel', value: 'time travel movies', category: 'theme', description: 'Time paradoxes' },
  { label: 'Heist', value: 'heist movies', category: 'theme', description: 'Robbery thrillers' },
  { label: 'Sports', value: 'sports movies', category: 'theme', description: 'Athletic films' },
  { label: 'Music', value: 'music movies', category: 'theme', description: 'Musical films' },
  { label: 'Dance', value: 'dance movies', category: 'theme', description: 'Dance films' },
  
  // Moods
  { label: 'Feel Good', value: 'feel good movies', category: 'mood', description: 'Uplifting films' },
  { label: 'Dark', value: 'dark movies', category: 'mood', description: 'Dark and gritty' },
  { label: 'Mind-Bending', value: 'mind-bending movies', category: 'mood', description: 'Complex plots' },
  { label: 'Emotional', value: 'emotional movies', category: 'mood', description: 'Tear-jerkers' },
  { label: 'Inspirational', value: 'inspirational movies', category: 'mood', description: 'Motivational' },
  { label: 'Intense', value: 'intense movies', category: 'mood', description: 'Edge of seat' },
  
  // Popular Actors
  { label: 'Tom Cruise', value: 'movies with Tom Cruise', category: 'actor', description: 'Mission Impossible star' },
  { label: 'Leonardo DiCaprio', value: 'movies with Leonardo DiCaprio', category: 'actor', description: 'Titanic star' },
  { label: 'Margot Robbie', value: 'movies with Margot Robbie', category: 'actor', description: 'Barbie star' },
  { label: 'Dwayne Johnson', value: 'movies with Dwayne Johnson', category: 'actor', description: 'The Rock' },
  { label: 'Scarlett Johansson', value: 'movies with Scarlett Johansson', category: 'actor', description: 'Black Widow' },
  { label: 'Ryan Reynolds', value: 'movies with Ryan Reynolds', category: 'actor', description: 'Deadpool star' },
  { label: 'Zendaya', value: 'movies with Zendaya', category: 'actor', description: 'Dune star' },
  { label: 'Timothée Chalamet', value: 'movies with Timothée Chalamet', category: 'actor', description: 'Dune star' },
  
  // Popular Directors
  { label: 'Christopher Nolan', value: 'movies by Christopher Nolan', category: 'director', description: 'Interstellar, Inception' },
  { label: 'Martin Scorsese', value: 'movies by Martin Scorsese', category: 'director', description: 'Goodfellas, The Irishman' },
  { label: 'Quentin Tarantino', value: 'movies by Quentin Tarantino', category: 'director', description: 'Pulp Fiction, Django' },
  { label: 'Steven Spielberg', value: 'movies by Steven Spielberg', category: 'director', description: 'Jurassic Park, E.T.' },
  { label: 'Denis Villeneuve', value: 'movies by Denis Villeneuve', category: 'director', description: 'Dune, Arrival' },
  { label: 'Greta Gerwig', value: 'movies by Greta Gerwig', category: 'director', description: 'Barbie, Little Women' },
  
  // Studios/Collections
  { label: 'Marvel', value: 'Marvel movies', category: 'studio', description: 'MCU films' },
  { label: 'DC', value: 'DC movies', category: 'studio', description: 'DC Universe' },
  { label: 'Pixar', value: 'Pixar movies', category: 'studio', description: 'Animated classics' },
  { label: 'Disney', value: 'Disney movies', category: 'studio', description: 'Disney films' },
  { label: 'Star Wars', value: 'Star Wars movies', category: 'collection', description: 'Galaxy far away' },
  { label: 'Harry Potter', value: 'Harry Potter movies', category: 'collection', description: 'Wizarding world' },
  { label: 'Lord of the Rings', value: 'Lord of the Rings movies', category: 'collection', description: 'Middle-earth' },
  { label: 'James Bond', value: 'James Bond movies', category: 'collection', description: '007 films' },
  { label: 'Fast & Furious', value: 'Fast and Furious movies', category: 'collection', description: 'Car action' },
];

/**
 * Filter suggestions based on user input after @
 */
export function filterSuggestions(input: string): AutocompleteSuggestion[] {
  if (!input) return autocompleteSuggestions;
  
  const lowerInput = input.toLowerCase();
  
  return autocompleteSuggestions.filter(suggestion => 
    suggestion.label.toLowerCase().startsWith(lowerInput) ||
    suggestion.label.toLowerCase().includes(lowerInput)
  ).slice(0, 8); // Limit to 8 suggestions
}

/**
 * Get category color for visual grouping
 */
export function getCategoryColor(category: AutocompleteSuggestion['category']): string {
  const colors = {
    genre: 'text-indigo-400',
    decade: 'text-purple-400',
    theme: 'text-pink-400',
    mood: 'text-cyan-400',
    actor: 'text-yellow-400',
    director: 'text-green-400',
    studio: 'text-orange-400',
    collection: 'text-red-400',
  };
  return colors[category] || 'text-gray-400';
}
