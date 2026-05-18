// components/movies/MovieGrid.tsx
"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import MovieCard from "./cards/MovieCard";
import AnimeGrid from "@/components/anime/AnimeGrid";
import { cn } from "@/lib/utils";
import { useUserSettings } from "@/hooks/useUserSettings";
import CardSkeleton from "@/components/ui/card-skeleton";
import { filterBlockedContentForUser } from "@/lib/firebase/userBlockedContent";
import { useAuth } from "@/contexts/AuthContext";
import { PROVIDERS } from "@/lib/features/providers/providerMapping";
import { motion } from "framer-motion";
// import MovieTabs, { movieSections } from '../sections/MovieTabs';

interface MovieGridProps {
  section: string;
  mediaType?: 'movie' | 'tv' | 'anime';
  filters?: {
    genres: number[];
    rating: number;
    year: number | null;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  };
  className?: string;
  initialCount?: number; // New prop to control initial item count
  selectedProviders?: string[]; // New prop for provider filtering
  onProviderChange?: (providers: string[]) => void; // Callback to clear provider filter
}

interface Movie {
  id: number;
  title?: string;
  name?: string;
  poster_path: string;
  backdrop_path: string;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  genre_ids: number[];
  overview: string;
  media_type?: 'movie' | 'tv';
}

const defaultFilters = {
  genres: [],
  rating: 0,
  year: null,
  sortBy: 'popularity',
  sortOrder: 'desc' as const
};

export default function MovieGrid({
  section,
  mediaType = 'movie',
  filters = defaultFilters,
  className,
  initialCount = 36, // Default to 36 items (6x6 grid)
  selectedProviders = [], // Default to empty array
  onProviderChange // Callback to clear provider filter
}: MovieGridProps) {
  // If mediaType is anime, use AnimeGrid instead
  if (mediaType === 'anime') {
    return (
      <AnimeGrid
        section={section}
        filters={filters}
        className={className}
      />
    );
  }

  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalResults, setTotalResults] = useState(0);
  const { settings } = useUserSettings();
  const { user } = useAuth();

  // Handle blocking a movie
  const handleBlockMovie = (movieId: number) => {
    // Remove the blocked movie from the current list
    setMovies(prevMovies => prevMovies.filter(m => m.id !== movieId));
  };

  useEffect(() => {
    setMovies([]);
    setPage(1);
    setHasMore(true);
    fetchMovies(1, true);
  }, [section, mediaType, JSON.stringify(filters), JSON.stringify(selectedProviders), settings.preferences.contentFilter]); // Added provider filtering dependency

  const getApiUrl = (pageNum: number) => {
    const baseUrl = 'https://api.themoviedb.org/3';
    const params = new URLSearchParams();
    params.append('page', pageNum.toString());
    params.append('language', 'en-US');

    // Handle endpoints first
    let endpoint = '';
    const isFilterMode = filters.genres.length > 0 || filters.year || filters.rating > 0;
    const hasProviderFilter = selectedProviders && selectedProviders.length > 0;

    // Always use discover endpoint when provider filter is active OR other filters are active
    if (isFilterMode || hasProviderFilter) {
      // Use discover endpoint when filters are active - apply our custom filtering here
      endpoint = `/discover/${mediaType}`;
      
      // Add adult content filter based on user settings
      const includeAdult = settings?.preferences?.contentFilter === 'all';
      params.append('include_adult', includeAdult.toString());

      // Add enhanced filtering to block inappropriate content (but less restrictive for more results)
      if (!includeAdult) {
        // Lower thresholds to get more legitimate content
        params.append('vote_count.gte', '5'); // Very low threshold to include most content
        params.append('vote_average.gte', '2.0'); // Very low threshold
        
        // Add regional filtering only if specified
        const preferredCountry = settings?.preferences?.country || 'US';
        if (preferredCountry && preferredCountry !== 'all') {
          // Add basic certification filtering only
          params.append('certification_country', preferredCountry);
          if (preferredCountry === 'US') {
            params.append('certification.lte', 'R'); // No NC-17 content
          } else if (preferredCountry === 'GB') {
            params.append('certification.lte', '18'); // Allow up to 18 rating
          }
        }
        
        // For romance and drama categories, add moderate safeguards
        if (filters.genres.includes(10749) || filters.genres.includes(18)) {
          // Exclude obvious adult keywords but don't force language/country at API level
          params.append('without_keywords', '9715,12639,158086,190859,210024'); // Adult/erotic keywords only
          
          // Lower quality thresholds to get more results
          params.append('vote_average.gte', '5.5'); // Moderate rating requirement
          params.append('vote_count.gte', '50'); // Lower vote requirement
          
          // Less restrictive certification
          if (preferredCountry === 'US') {
            params.append('certification_country', 'US');
            params.append('certification.lte', 'R'); // Allow R-rated but not NC-17
          }
        }
        
        // Block only the most obvious adult content keywords (minimal blocking)
        params.append('without_keywords', '9715,12639'); // Only the most obvious adult keywords
      }

      // Add filter parameters
      if (filters.genres.length > 0) {
        params.append('with_genres', filters.genres.join(','));
      }
      
      // Add year filter
      if (filters.year) {
        if (mediaType === 'movie') {
          params.append('primary_release_year', filters.year.toString());
        } else {
          params.append('first_air_date_year', filters.year.toString());
        }
      }

      // Add sort parameters
      if (filters.sortBy) {
        params.append('sort_by', `${filters.sortBy}.${filters.sortOrder}`);
      }

      // Add watch provider filter if selected
      if (hasProviderFilter) {
        const selectedProvider = PROVIDERS.find(p => p.id === selectedProviders[0]);
        if (selectedProvider?.tmdbWatchProviderId) {
          params.append('watch_region', 'US'); // Required for watch provider filtering
          params.append('with_watch_providers', selectedProvider.tmdbWatchProviderId.toString());
        }
      }
    } else if (hasProviderFilter) {
      // When provider filter is active, ALWAYS use /discover endpoint
      // because specific endpoints (trending, popular, etc.) don't support watch provider filtering
      endpoint = `/discover/${mediaType}`;
      
      const selectedProvider = PROVIDERS.find(p => p.id === selectedProviders[0]);
      if (selectedProvider?.tmdbWatchProviderId) {
        params.append('watch_region', 'US');
        params.append('with_watch_providers', selectedProvider.tmdbWatchProviderId.toString());
      }
      
      // Apply section-specific sorting when using discover endpoint
      switch (section) {
        case 'trending':
        case 'trending_movies':
        case 'trending_tv':
          params.append('sort_by', 'popularity.desc');
          break;
        case 'popular':
        case 'popular_movies':
        case 'popular_tv':
          params.append('sort_by', 'popularity.desc');
          break;
        case 'top_rated':
        case 'top_rated_movies':
        case 'top_rated_tv':
          params.append('sort_by', 'vote_average.desc');
          params.append('vote_count.gte', '100'); // Only well-rated movies
          break;
        case 'upcoming':
        case 'upcoming_movies':
        case 'comingsoon':
          if (mediaType === 'movie') {
            params.append('primary_release_date.gte', new Date().toISOString().split('T')[0]);
            params.append('sort_by', 'primary_release_date.asc');
          }
          break;
        case 'oscars2024':
          params.append('primary_release_date.gte', '2024-01-01');
          params.append('primary_release_date.lte', '2025-12-31');
          params.append('vote_count.gte', '100');
          params.append('vote_average.gte', '7.0');
          params.append('sort_by', 'vote_average.desc');
          params.append('with_genres', '18,36,36');
          break;
        case 'mustwatch':
          params.append('vote_count.gte', '2000');
          params.append('vote_average.gte', '8.0');
          params.append('sort_by', 'vote_count.desc');
          params.append('primary_release_date.gte', '1990-01-01');
          break;
        default:
          params.append('sort_by', 'popularity.desc');
      }
    } else {
      // Use specific endpoints when no filters are active - DON'T modify these with custom parameters
      // These endpoints should match TMDB website exactly
      switch (section) {
        case 'trending':
        case 'trending_movies':
        case 'trending_tv':
          endpoint = `/trending/${mediaType}/day`;
          break;
        case 'now_playing':
          // Use TMDB's standard endpoint as-is, no custom filtering
          endpoint = mediaType === 'movie' ? '/movie/now_playing' : '/tv/on_the_air';
          break;
        case 'on_the_air':
          // Use TMDB's standard endpoint as-is
          endpoint = '/tv/on_the_air';
          break;
        case 'airing_today':
          // Use TMDB's standard endpoint as-is
          endpoint = '/tv/airing_today';
          break;
        case 'popular':
        case 'popular_movies':
        case 'popular_tv':
          // Use TMDB's standard endpoint as-is
          endpoint = `/${mediaType}/popular`;
          break;
        case 'top_rated':
        case 'top_rated_movies':
        case 'top_rated_tv':
          // Use TMDB's standard endpoint as-is
          endpoint = `/${mediaType}/top_rated`;
          break;
        case 'upcoming':
        case 'upcoming_movies':
          // Use TMDB's standard upcoming endpoint as-is - this has special date filtering built-in
          endpoint = mediaType === 'movie' ? '/movie/upcoming' : '/tv/airing_today';
          // Don't add any custom parameters - TMDB handles the date ranges internally
          break;
        case 'comingsoon':
          // Coming soon - use TMDB's upcoming endpoint instead of custom discover
          // This ensures we get the same results as the TMDB website
          endpoint = mediaType === 'movie' ? '/movie/upcoming' : '/tv/airing_today';
          // Don't override TMDB's built-in date filtering
          break;
        case 'oscars2024':
          // Oscar contenders - movies from 2024-2025 award season
          endpoint = `/discover/movie`;
          params.append('primary_release_date.gte', '2024-01-01');
          params.append('primary_release_date.lte', '2025-12-31');
          params.append('vote_count.gte', '100');
          params.append('vote_average.gte', '7.0');
          params.append('sort_by', 'vote_average.desc');
          // Include drama, biography, and historical genres common in Oscar films
          params.append('with_genres', '18,36,36');
          break;
        case 'mustwatch':
          // Must watch - top rated movies with high vote counts, focusing on classics and universally acclaimed films
          endpoint = `/discover/movie`;
          params.append('vote_count.gte', '2000');
          params.append('vote_average.gte', '8.0');
          params.append('sort_by', 'vote_count.desc');
          // Include multiple time periods for variety
          params.append('primary_release_date.gte', '1990-01-01');
          break;
        default:
          endpoint = `/discover/${mediaType}`;
      }
    }

    const finalUrl = `${baseUrl}${endpoint}?${params.toString()}`;
    return finalUrl;
  };

  const fetchMovies = async (pageNum: number, isNewRequest: boolean = false) => {
    // Set appropriate loading state
    if (isNewRequest || pageNum === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError(null);

    try {
      let allFilteredResults: Movie[] = [];
      const hasProviderFilter = selectedProviders && selectedProviders.length > 0;
      
      // When provider filter is active, fetch fewer pages since API filters for us
      const pagesToFetch = hasProviderFilter ? 2 : 1; // Only 2 pages when filtering (API does the work)
      const startPage = isNewRequest ? 1 : pageNum;
      
      for (let i = 0; i < pagesToFetch; i++) {
        const currentPage = startPage + i;
        const apiUrl = getApiUrl(currentPage);
        
        const response = await fetch(
          apiUrl,
          {
            headers: {
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_TMDB_API_READ_ACCESS_TOKEN}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Failed to fetch movies`);
        }

        const data = await response.json();

        if (!data.results) {
          throw new Error('No results in API response');
        }

        // Basic filtering - only remove movies without posters and apply user rating filter
        let pageResults = data.results.filter((movie: Movie) => {
          const hasValidPoster = movie.poster_path != null;
          const meetsRatingCriteria = !filters.rating || movie.vote_average >= filters.rating;
          return hasValidPoster && meetsRatingCriteria;
        });

        // Apply manual blocked content filtering
        if (user) {
          pageResults = await filterBlockedContentForUser(pageResults, mediaType, user.uid);
        }

        // NO NEED to manually filter by provider - the API already did it for us!

        allFilteredResults = [...allFilteredResults, ...pageResults];

        // Update pagination info from last fetch
        if (i === pagesToFetch - 1) {
          setTotalResults(data.total_results);
          setHasMore(currentPage < data.total_pages);
          setPage(currentPage);
        }

        // If we have enough results, break early
        if (allFilteredResults.length >= initialCount && isNewRequest) {
          break;
        }
      }

      // Apply initial count limit for the first request only
      if (isNewRequest) {
        allFilteredResults = allFilteredResults.slice(0, initialCount);
      }

      setMovies(prev => isNewRequest ? allFilteredResults : [...prev, ...allFilteredResults]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load content. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!loading && !loadingMore && hasMore) {
      // Normal pagination - API handles provider filtering
      fetchMovies(page + 1);
    }
  };

  if (loading && movies.length === 0) {
    return (
      <div className={cn("grid gap-6", className)}>
        <CardSkeleton count={20} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <p className="text-red-400 mb-4">{error}</p>
        <Button 
          variant="outline" 
          onClick={() => fetchMovies(1, true)}
        >
          Try Again
        </Button>
      </div>
    );
  }

  if (movies.length === 0) {
    const hasProviderFilter = selectedProviders && selectedProviders.length > 0;
    const selectedProvider = hasProviderFilter ? PROVIDERS.find(p => p.id === selectedProviders[0]) : null;
    
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-lg w-full"
        >
          {/* Icon */}
          <div className="mb-10 flex justify-center">
            <svg className="w-24 h-24 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
            </svg>
          </div>

          {/* Text */}
          <h3 className="text-2xl font-bold text-white mb-4">
            No Results Found
          </h3>
          
          {hasProviderFilter && selectedProvider ? (
            <p className="text-base text-gray-400 mb-8 leading-relaxed">
              We couldn't find any {mediaType === 'movie' ? 'movies' : mediaType === 'tv' ? 'TV shows' : 'content'} available on{' '}
              <span className="text-white font-semibold">{selectedProvider.name}</span> for this section.
            </p>
          ) : (
            <p className="text-base text-gray-400 mb-8 leading-relaxed">
              We couldn't find any {mediaType === 'movie' ? 'movies' : mediaType === 'tv' ? 'TV shows' : 'content'} matching your current filters.
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            {hasProviderFilter && (
              <button
                onClick={() => onProviderChange && onProviderChange([])}
                className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:via-indigo-400 hover:to-indigo-500 text-white text-sm font-semibold rounded-lg transition-all"
              >
                Clear Provider Filter
              </button>
            )}
            <button
              onClick={() => fetchMovies(1, true)}
              className="w-full sm:w-auto px-8 py-3 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 text-white text-sm font-semibold rounded-lg transition-all"
            >
              Try Again
            </button>
          </div>

          {/* Suggestion Text */}
          <p className="mt-8 text-sm text-gray-500">
            {hasProviderFilter 
              ? "Try selecting a different streaming provider or browse other sections" 
              : "Try adjusting your filters or browse popular content"}
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full overflow-x-hidden max-w-full">
      <div
        className={cn(
          "grid gap-3 sm:gap-4 md:gap-6 w-full min-h-0 overflow-x-hidden",
          className
        )}
      >
        {movies.map((movie, index) => (
          <div key={`${movie.id}-${index}`}>
            <MovieCard
              movie={{
                ...movie,
                title: movie.title || movie.name || '',
                media_type: mediaType,
                type: mediaType,
                addedAt: new Date().toISOString()
              }}
              onBlock={handleBlockMovie}
            />
          </div>
        ))}
        
        {/* Show skeleton cards while loading more */}
        {loadingMore && (
          <>
            {Array.from({ length: 20 }).map((_, index) => (
              <CardSkeleton key={`skeleton-${index}`} count={1} />
            ))}
          </>
        )}
      </div>

      {hasMore && (
        <div className="flex justify-center mt-8">
          <button
            onClick={handleLoadMore}
            disabled={loading || loadingMore}
            className="px-12 py-3.5 bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:via-indigo-400 hover:to-indigo-500 text-white text-base font-semibold rounded-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingMore ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Load More {mediaType === 'movie' ? 'Movies' : mediaType === 'tv' ? 'TV Shows' : 'Anime'}
              </>
            )}
          </button>
        </div>
      )}

      <div className="text-center text-sm text-gray-400">
        Showing {movies.length} of {totalResults} results
      </div>
    </div>
  );
}