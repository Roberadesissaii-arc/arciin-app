// components/tv-shows/TVShowGrid.tsx
"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import TVShowCard from "./cards/TVShowCard";
import { cn } from "@/lib/utils";
import { useUserSettings } from "@/hooks/useUserSettings";
import CardSkeleton from "@/components/ui/card-skeleton";
import { filterBlockedContentForUser } from "@/lib/firebase/userBlockedContent";
import { useAuth } from "@/contexts/AuthContext";

interface TVShowGridProps {
  section: string;
  filters?: {
    genres: number[];
    rating: number;
    year: number | null;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  };
  className?: string;
  initialCount?: number;
}

interface TVShow {
  id: number;
  name: string;
  poster_path: string;
  backdrop_path: string;
  vote_average: number;
  first_air_date: string;
  genre_ids: number[];
  overview: string;
}

const defaultFilters = {
  genres: [],
  rating: 0,
  year: null,
  sortBy: 'popularity',
  sortOrder: 'desc' as const
};

export default function TVShowGrid({
  section,
  filters = defaultFilters,
  className,
  initialCount = 20
}: TVShowGridProps) {
  const [shows, setShows] = useState<TVShow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalResults, setTotalResults] = useState(0);
  const { settings } = useUserSettings();
  const { user } = useAuth();

  // Handle blocking a TV show
  const handleBlockShow = (showId: number) => {
    // Remove the blocked show from the current list
    setShows(prevShows => prevShows.filter(s => s.id !== showId));
  };

  useEffect(() => {
    setShows([]);
    setPage(1);
    setHasMore(true);
    fetchTVShows(1, true);
  }, [section, JSON.stringify(filters), settings.preferences.contentFilter]);

  const getApiUrl = (pageNum: number) => {
    const baseUrl = 'https://api.themoviedb.org/3';
    const params = new URLSearchParams();
    params.append('page', pageNum.toString());
    params.append('language', 'en-US');

    let endpoint = '';
    const isFilterMode = filters.genres.length > 0 || filters.year || filters.rating > 0;

    if (isFilterMode) {
      endpoint = `/discover/tv`;
      
      const includeAdult = settings?.preferences?.contentFilter === 'all';
      params.append('include_adult', includeAdult.toString());

      if (!includeAdult) {
        params.append('vote_count.gte', '5');
        params.append('vote_average.gte', '2.0');
        
        const preferredCountry = settings?.preferences?.country || 'US';
        if (preferredCountry && preferredCountry !== 'all') {
          params.append('certification_country', preferredCountry);
          if (preferredCountry === 'US') {
            params.append('certification.lte', 'TV-MA');
          }
        }
        
        params.append('without_keywords', '9715,12639');
      }

      if (filters.genres.length > 0) {
        params.append('with_genres', filters.genres.join(','));
      }
      
      if (filters.year) {
        params.append('first_air_date_year', filters.year.toString());
      }

      if (filters.sortBy) {
        params.append('sort_by', `${filters.sortBy}.${filters.sortOrder}`);
      }
    } else {
      // TV-specific endpoints
      switch (section) {
        case 'popular':
          endpoint = '/tv/popular';
          break;
        case 'on_the_air':
          endpoint = '/tv/on_the_air';
          break;
        case 'airing_today':
          endpoint = '/tv/airing_today';
          break;
        case 'top_rated':
          endpoint = '/tv/top_rated';
          break;
        default:
          endpoint = '/tv/popular';
      }
    }

    return `${baseUrl}${endpoint}?${params.toString()}`;
  };

  const fetchTVShows = async (pageNum: number, isNewRequest: boolean = false) => {
    // Set appropriate loading state
    if (isNewRequest || pageNum === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError(null);

    try {
      const apiUrl = getApiUrl(pageNum);
      
      const response = await fetch(
        apiUrl,
        {
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_TMDB_API_READ_ACCESS_TOKEN}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch TV shows`);
      }

      const data = await response.json();

      if (!data.results) {
        throw new Error('No results in API response');
      }

      let filteredResults = data.results.filter((show: TVShow) => {
        const hasValidPoster = show.poster_path != null;
        const meetsRatingCriteria = !filters.rating || show.vote_average >= filters.rating;
        return hasValidPoster && meetsRatingCriteria;
      });

      // Apply manual blocked content filtering ONLY - no automatic filtering
      // Filter based on user ID if logged in
      if (user) {
        filteredResults = await filterBlockedContentForUser(filteredResults, 'tv', user.uid);
      }
      if (isNewRequest && pageNum === 1) {
        const isFilterMode = filters.genres.length > 0 || filters.year || filters.rating > 0;
        const countToUse = isFilterMode ? 10 : initialCount;
        filteredResults = filteredResults.slice(0, countToUse);
      }

      setShows(prev => isNewRequest ? filteredResults : [...prev, ...filteredResults]);
      setTotalResults(data.total_results);
      setHasMore(pageNum < data.total_pages);
      setPage(pageNum);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load TV shows. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!loading && !loadingMore && hasMore) {
      fetchTVShows(page + 1);
    }
  };

  if (loading && shows.length === 0) {
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
          onClick={() => fetchTVShows(1, true)}
        >
          Try Again
        </Button>
      </div>
    );
  }

  if (shows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <p className="text-gray-400 mb-2">No TV shows found</p>
        <p className="text-sm text-gray-500">
          Try adjusting your filters or changing your search criteria
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full overflow-x-hidden max-w-full">
      <div
        className={cn(
          "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 w-full min-h-0 overflow-x-hidden",
          className
        )}
      >
        {shows.map((show, index) => (
          <div key={`${show.id}-${index}`}>
            <TVShowCard
              show={{
                ...show,
                title: show.name || '',
                media_type: 'tv',
                type: 'tv',
                addedAt: new Date().toISOString()
              }}
              onBlock={handleBlockShow}
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
          <Button
            variant="outline"
            onClick={handleLoadMore}
            disabled={loading || loadingMore}
          >
            {loadingMore ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading more...
              </>
            ) : (
              'Load More'
            )}
          </Button>
        </div>
      )}

      <div className="text-center text-sm text-gray-400">
        Showing {shows.length} of {totalResults} results
      </div>
    </div>
  );
}
