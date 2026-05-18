'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import SearchInput from './SearchInput';
import SearchHero from './sections/SearchHero';
import FeaturedContentGrid from './sections/FeaturedContentGrid';
import SearchResultsDisplay from './sections/SearchResultsDisplay';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import { 
  searchMovies, 
  searchTVShows, 
  searchPeople,
  searchAnime 
} from '@/lib/api';
import { useUserSettings } from '@/hooks/useUserSettings';

interface SearchResult {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  profile_path?: string | null;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  media_type: 'movie' | 'tv' | 'person';
  overview?: string;
  origin_country?: string[];
  known_for_department?: string;
}

interface SearchResultsProps {
  initialQuery?: string;
  className?: string;
}

export default function SearchResults({ initialQuery = '', className = '' }: SearchResultsProps) {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [searchResults, setSearchResults] = useState<{
    movies: SearchResult[];
    tvShows: SearchResult[];
    people: SearchResult[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { history } = useSearchHistory();
  const { settings } = useUserSettings();

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    setSearchQuery(query);

    try {
      const includeAdult = settings?.preferences?.contentFilter === 'all';
      
      // Search all content types in parallel
      const [moviesRes, tvShowsRes, peopleRes] = await Promise.all([
        searchMovies(query, includeAdult, undefined, 1),
        searchTVShows(query, includeAdult, undefined, 1), 
        searchPeople(query, includeAdult, 1)
      ]);

      setSearchResults({
        movies: moviesRes.results || [],
        tvShows: tvShowsRes.results || [],
        people: peopleRes.results || []
      });
    } catch (err) {
      setError('Failed to search. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle initial query
  useEffect(() => {
    if (initialQuery) {
      handleSearch(initialQuery);
    }
  }, [initialQuery, settings]);

  const handleRecentSearchClick = (query: string) => {
    handleSearch(query);
  };

  return (
    <div className={`min-h-screen bg-black text-white ${className}`}>
      <div className="container mx-auto px-4 pt-24 md:pt-20 pb-8 space-y-4 md:space-y-6">
        {!searchQuery ? (
          <>
            {/* Hero Section with embedded search input for both mobile and desktop */}
            <SearchHero
              recentSearches={history.map(h => h.query)}
              onRecentSearchClick={handleRecentSearchClick}
              searchInput={
                <SearchInput 
                  initialValue={searchQuery}
                  onSearch={handleSearch}
                  placeholder="Search movies, shows & people..."
                  className="w-full max-w-2xl"
                />
              }
            />

            {/* Featured Movies Hero Section - isolated background */}
            <div className="relative z-1 bg-black pt-8 -mt-4">
              <FeaturedContentGrid
                title="Featured Movies & Shows"
                subtitle="Trending content to discover"
              />
            </div>
          </>
        ) : (
          <>
            {/* Search Input when showing results */}
            <div className="flex justify-center pt-4 md:pt-0 px-2">
              <SearchInput 
                initialValue={searchQuery}
                onSearch={handleSearch}
                placeholder="Search movies, shows & people..."
                className="w-full max-w-2xl"
              />
            </div>
            
            <SearchResultsDisplay
              searchResults={searchResults}
              isLoading={isLoading}
              error={error}
              searchQuery={searchQuery}
            />
          </>
        )}
      </div>
    </div>
  );
}