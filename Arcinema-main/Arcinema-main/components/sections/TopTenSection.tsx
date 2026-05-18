"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import WatchProviderBadge from "@/components/ui/WatchProviderBadge";
import { getAllBlockedContent } from "@/lib/firebase/blockedContent";

interface Movie {
  id: number;
  title?: string;
  name?: string;
  poster_path: string;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
}

export default function TopTenSection() {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [topMovies, setTopMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  useEffect(() => {
    const fetchTopMovies = async () => {
      try {
        const response = await fetch(
          'https://api.themoviedb.org/3/trending/movie/week?language=en-US',
          {
            headers: {
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_TMDB_API_READ_ACCESS_TOKEN}`,
            },
          }
        );
        const data = await response.json();
        
        // Filter out blocked content
        const blockedMap = await getAllBlockedContent();
        const filteredResults = data.results.filter((movie: Movie) => {
          const key = `movie_${movie.id}`;
          return !blockedMap.has(key);
        });
        
        setTopMovies(filteredResults.slice(0, 10));
        setLoading(false);
      } catch (error) {
        setLoading(false);
      }
    };
    fetchTopMovies();
  }, []);

  const checkScrollButtons = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const cardWidth = 280; // Card width (w-56 = 224px) + gap (24px) + margin
      const scrollAmount = direction === 'left' ? -cardWidth : cardWidth;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      setTimeout(checkScrollButtons, 300);
    }
  };

  if (loading) {
    return (
      <div className="px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-800 rounded w-48 mb-6"></div>
          <div className="flex gap-6 overflow-hidden">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex-shrink-0 w-48 h-72 bg-gray-800 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-8 mt-4 bg-black relative group">
      <h2 className="text-2xl md:text-3xl font-bold text-white mb-8">Top 10 This Week</h2>
      
      {/* Left Arrow */}
      {showLeftArrow && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-20 bg-black/80 hover:bg-black text-white p-3 rounded-full transition-all backdrop-blur-sm opacity-0 group-hover:opacity-100"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {/* Right Arrow */}
      {showRightArrow && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-20 bg-black/80 hover:bg-black text-white p-3 rounded-full transition-all backdrop-blur-sm opacity-0 group-hover:opacity-100"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}
      
      <div 
        ref={scrollRef}
        onScroll={checkScrollButtons}
        className="flex gap-6 overflow-x-auto scrollbar-hide pb-6"
      >
        {topMovies.map((movie, index) => (
          <motion.div
            key={movie.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => router.push(`/movies/${movie.id}`)}
            className="flex-shrink-0 cursor-pointer group relative"
          >
            {/* Big Ranking Number */}
            <div className="absolute -left-2 top-0 z-10">
              <span className="text-8xl font-black text-white [text-shadow:_-3px_-3px_0_#000,_3px_-3px_0_#000,_-3px_3px_0_#000,_3px_3px_0_#000] leading-none">
                {index + 1}
              </span>
            </div>

            {/* Poster Card */}
            <div className="relative w-56 ml-5 aspect-[2/3] rounded-xl overflow-hidden shadow-2xl">
              <Image
                src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                alt={movie.title || movie.name || 'Movie'}
                fill
                className="object-cover hover:scale-105 transition-transform duration-300"
              />
              
              {/* Provider Badge - Top Left */}
              <div className="absolute top-3 left-3">
                <WatchProviderBadge
                  mediaId={movie.id}
                  mediaType="movie"
                  size="medium"
                />
              </div>
              
              {/* Rating Badge */}
              <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-md rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-lg">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                <span className="text-sm text-white font-semibold">{movie.vote_average.toFixed(1)}</span>
              </div>
            </div>

            {/* Title and Year */}
            <div className="mt-3 ml-5 w-56">
              <p className="text-base font-medium text-white line-clamp-1">
                {movie.title || movie.name}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {movie.release_date 
                  ? new Date(movie.release_date).getFullYear() 
                  : movie.first_air_date 
                  ? new Date(movie.first_air_date).getFullYear() 
                  : 'N/A'}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
