// lib/search/index.ts
export * from './movieSearch';
export * from './personSearch';

import { searchMovies, searchTVShows, searchAll, extractAndFetchContent, type Movie, type SearchOptions } from './movieSearch';
import { searchPeople, getPersonDetails, normalizeSearchTerm, type Person, type PersonSearchOptions } from './personSearch';

// Combined search interface
export interface UniversalSearchOptions {
  contentFilter?: 'all' | 'filtered';
  country?: string;
  includeAdult?: boolean;
  includeMovies?: boolean;
  includeTVShows?: boolean;
  includePeople?: boolean;
}

export interface SearchResults {
  movies: Movie[];
  tvShows: Movie[];
  people: Person[];
  total: number;
}

// Universal search function that searches movies, TV shows, and people
export const universalSearch = async (
  query: string,
  options: UniversalSearchOptions = {}
): Promise<SearchResults> => {
  const {
    contentFilter = 'all',
    country = 'all',
    includeAdult = true,
    includeMovies = true,
    includeTVShows = true,
    includePeople = true
  } = options;

  const searchOptions: SearchOptions = {
    contentFilter,
    country,
    includeAdult
  };

  const personSearchOptions: PersonSearchOptions = {
    contentFilter,
    includeAdult
  };

  try {
    const promises: Promise<any>[] = [];
    
    if (includeMovies) {
      promises.push(searchMovies(query, searchOptions));
    } else {
      promises.push(Promise.resolve([]));
    }
    
    if (includeTVShows) {
      promises.push(searchTVShows(query, searchOptions));
    } else {
      promises.push(Promise.resolve([]));
    }
    
    if (includePeople) {
      promises.push(searchPeople(query, personSearchOptions));
    } else {
      promises.push(Promise.resolve([]));
    }

    const [movies, tvShows, people] = await Promise.all(promises);

    return {
      movies: movies || [],
      tvShows: tvShows || [],
      people: people || [],
      total: (movies?.length || 0) + (tvShows?.length || 0) + (people?.length || 0)
    };
  } catch (error) {
    return {
      movies: [],
      tvShows: [],
      people: [],
      total: 0
    };
  }
};

// Smart search that automatically determines what the user is looking for
export const smartSearch = async (
  query: string,
  options: UniversalSearchOptions = {}
): Promise<SearchResults> => {
  const lowerQuery = query.toLowerCase();
  
  // Determine search intent
  const personKeywords = ['actor', 'actress', 'director', 'star', 'celebrity', 'who is', 'person'];
  const movieKeywords = ['movie', 'film'];
  const tvKeywords = ['tv show', 'television', 'series', 'show'];
  
  const isProbablyPerson = personKeywords.some(keyword => lowerQuery.includes(keyword));
  const isProbablyMovie = movieKeywords.some(keyword => lowerQuery.includes(keyword));
  const isProbablyTV = tvKeywords.some(keyword => lowerQuery.includes(keyword));
  
  // Adjust search options based on intent
  const searchOptions: UniversalSearchOptions = {
    ...options,
    includeMovies: !isProbablyPerson || isProbablyMovie,
    includeTVShows: !isProbablyPerson || isProbablyTV,
    includePeople: isProbablyPerson || (!isProbablyMovie && !isProbablyTV)
  };
  
  return universalSearch(query, searchOptions);
};

// Export the main functions for backward compatibility
export {
  searchMovies,
  searchTVShows,
  searchAll,
  extractAndFetchContent,
  searchPeople,
  getPersonDetails,
  normalizeSearchTerm
};
