// components/anime/AnimeGrid.tsx
"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import AnimeCard from "./AnimeCard";
import { cn } from "@/lib/utils";
import { getAnimeSectionData } from "@/lib/features/media/jikanApi";
import CardSkeleton from "@/components/ui/card-skeleton";

interface AnimeGridProps {
  section: string;
  filters?: {
    genres: number[];
    rating: number;
    year: number | null;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  };
  className?: string;
}

interface AnimeItem {
  id: number;
  title: string;
  name: string;
  poster_path: string;
  backdrop_path: string;
  vote_average: number;
  release_date: string;
  first_air_date: string;
  overview: string;
  genre_ids: number[];
  media_type: 'anime';
  episodes: number | null;
  status: string;
  rating: string;
  type: string;
  source: string;
  studios: any[];
  duration: string;
  mal_id: number;
  mal_url: string;
  trailer_url: string | null;
}

const defaultFilters = {
  genres: [],
  rating: 0,
  year: null,
  sortBy: 'popularity',
  sortOrder: 'desc' as const
};

export default function AnimeGrid({
  section,
  filters = defaultFilters,
  className
}: AnimeGridProps) {
  const [anime, setAnime] = useState<AnimeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalResults, setTotalResults] = useState(0);

  useEffect(() => {
    setAnime([]);
    setPage(1);
    setHasMore(true);
    fetchAnime(1, true);
  }, [section, JSON.stringify(filters)]);

  const fetchAnime = async (pageNum: number, isNewRequest: boolean = false) => {
    setLoading(true);
    setError(null);

    try {
      const response = await getAnimeSectionData(section, pageNum);
      
      if (!response.data) {
        throw new Error('No results in API response');
      }

      // Apply local filters if needed
      let filteredResults = response.data;
      
      if (filters.rating > 0) {
        filteredResults = filteredResults.filter(anime => anime.vote_average >= filters.rating);
      }
      
      if (filters.year) {
        filteredResults = filteredResults.filter(anime => {
          const animeYear = new Date(anime.release_date || anime.first_air_date).getFullYear();
          return animeYear === filters.year;
        });
      }

      setAnime(prev => isNewRequest ? filteredResults : [...prev, ...filteredResults]);
      
      if (response.pagination) {
        setTotalResults(response.pagination.items?.total || filteredResults.length);
        setHasMore(response.pagination.has_next_page);
        setPage(pageNum);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load anime. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchAnime(page + 1);
    }
  };

  if (loading && anime.length === 0) {
    return (
      <div className={cn("grid gap-6", className)}>
        <CardSkeleton count={20} />
      </div>
    );
  }

  if (error && anime.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <p className="text-red-400 mb-2">Error loading anime</p>
        <p className="text-sm text-gray-500 mb-4">{error}</p>
        <Button 
          onClick={() => fetchAnime(1, true)} 
          variant="outline"
          size="sm"
        >
          Try Again
        </Button>
      </div>
    );
  }

  if (anime.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <p className="text-gray-400 mb-2">No anime found</p>
        <p className="text-sm text-gray-500">
          Try adjusting your filters or changing your search criteria
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full overflow-hidden">
      <div
        className={cn(
          "grid gap-3 sm:gap-4 md:gap-6 w-full min-h-0 items-start",
          className
        )}
      >
        {anime.map((animeItem, index) => (
          <div key={`${animeItem.id}-${index}`} className="w-full flex">
            <AnimeCard anime={animeItem} />
          </div>
        ))}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center pt-8">
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className="px-12 py-3.5 bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:via-indigo-400 hover:to-indigo-500 text-white text-base font-semibold rounded-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Load More Anime
              </>
            )}
          </button>
        </div>
      )}

      {/* Results Info */}
      {totalResults > 0 && (
        <div className="text-center text-sm text-gray-500 pt-4">
          Showing {anime.length} of {totalResults} anime
        </div>
      )}
    </div>
  );
}