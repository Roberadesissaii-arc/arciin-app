"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { 
  Calendar, 
  TrendingUp, 
  Star, 
  Clock,
  Filter,
  ChevronDown,
  X
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface MovieFiltersProps {
  onFilterChange: (filters: FilterState) => void;
}

interface FilterState {
  sort: string;
  genre: string[];
  year: string;
}

const sortOptions = [
  { id: "popularity.desc", label: "Most Popular", icon: TrendingUp },
  { id: "vote_average.desc", label: "Top Rated", icon: Star },
  { id: "release_date.desc", label: "Latest", icon: Calendar },
  { id: "release_date.asc", label: "Oldest", icon: Clock },
];

const years = Array.from({ length: 24 }, (_, i) => (2024 - i).toString());

const genres = [
  { id: "28", name: "Action" },
  { id: "12", name: "Adventure" },
  { id: "16", name: "Animation" },
  { id: "35", name: "Comedy" },
  { id: "80", name: "Crime" },
  { id: "99", name: "Documentary" },
  { id: "18", name: "Drama" },
  { id: "10751", name: "Family" },
  { id: "14", name: "Fantasy" },
  { id: "36", name: "History" },
];

export default function MovieFilters({ onFilterChange }: MovieFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({
    sort: "popularity.desc",
    genre: [],
    year: "",
  });

  const [isOpen, setIsOpen] = useState(false);

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    onFilterChange(updatedFilters);
  };

  const clearFilters = () => {
    const defaultFilters = {
      sort: "popularity.desc",
      genre: [],
      year: "",
    };
    setFilters(defaultFilters);
    onFilterChange(defaultFilters);
  };

  return (
    <div className="relative mb-8 px-4 md:px-8">
      <motion.div 
        className="max-w-7xl mx-auto space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Main Filter Button */}
        <div className="flex items-center gap-4 flex-wrap">
          <Button
            variant="outline"
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              "bg-black/20 backdrop-blur-xl border-white/10",
              "hover:bg-white/10 hover:border-white/20",
              "transition-all duration-300"
            )}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
            <ChevronDown className={cn(
              "w-4 h-4 ml-2 transition-transform duration-200",
              isOpen && "transform rotate-180"
            )} />
          </Button>

          {/* Active Filters Display */}
          <div className="flex flex-wrap gap-2">
            {filters.genre.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2"
              >
                <span className="text-sm text-gray-400">
                  {filters.genre.length} genres selected
                </span>
              </motion.div>
            )}
            {filters.year && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2"
              >
                <span className="text-sm text-gray-400">
                  Year: {filters.year}
                </span>
              </motion.div>
            )}
            {(filters.genre.length > 0 || filters.year) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4 mr-1" />
                Clear all
              </Button>
            )}
          </div>
        </div>

        {/* Filter Panel */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-black/40 backdrop-blur-xl rounded-xl border border-white/10 p-6 space-y-6">
                {/* Sort Options */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-400">Sort by</h3>
                  <div className="flex flex-wrap gap-2">
                    {sortOptions.map((option) => (
                      <Button
                        key={option.id}
                        variant="outline"
                        size="sm"
                        onClick={() => handleFilterChange({ sort: option.id })}
                        className={cn(
                          "border-white/10 hover:border-white/20",
                          filters.sort === option.id && "bg-white/10 border-white/20"
                        )}
                      >
                        <option.icon className="w-4 h-4 mr-2" />
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Genre Selection */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-400">Genres</h3>
                  <div className="flex flex-wrap gap-2">
                    {genres.map((genre) => (
                      <Button
                        key={genre.id}
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newGenres = filters.genre.includes(genre.id)
                            ? filters.genre.filter(id => id !== genre.id)
                            : [...filters.genre, genre.id];
                          handleFilterChange({ genre: newGenres });
                        }}
                        className={cn(
                          "border-white/10 hover:border-white/20",
                          filters.genre.includes(genre.id) && "bg-white/10 border-white/20"
                        )}
                      >
                        {genre.name}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Year Selection */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-400">Release Year</h3>
                  <div className="flex flex-wrap gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-white/10 hover:border-white/20"
                        >
                          {filters.year || "Select Year"}
                          <ChevronDown className="w-4 h-4 ml-2" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        className="max-h-[200px] overflow-y-auto bg-black/90 backdrop-blur-xl border-white/10"
                      >
                        {years.map((year) => (
                          <DropdownMenuItem
                            key={year}
                            onClick={() => handleFilterChange({ year })}
                          >
                            {year}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
} 

// "use client";

// import { useState, useEffect } from "react";
// import { motion } from "framer-motion";
// import MovieCard from "./MovieCard";
// import { Loader2 } from "lucide-react";
// import dynamic from 'next/dynamic';
// import MovieFilters from "../sections/MovieFilters";

// // Dynamically import InfiniteScroll with no SSR
// const InfiniteScroll = dynamic(() => import('react-infinite-scroll-component'), {
//   ssr: false
// });

// interface Movie {
//   id: number;
//   title: string;
//   poster_path: string;
//   vote_average: number;
//   media_type: string;
// }

// interface FilterState {
//   sort: string;
//   genre: string[];
//   year: string;
// }

// export default function MovieGrid() {
//   const [movies, setMovies] = useState<Movie[]>([]);
//   const [page, setPage] = useState(1);
//   const [loading, setLoading] = useState(true);
//   const [hasMore, setHasMore] = useState(true);
//   const [totalResults, setTotalResults] = useState(0);
//   const [activeFilters, setActiveFilters] = useState<FilterState>({
//     sort: "popularity.desc",
//     genre: [],
//     year: "",
//   });

//   const fetchMovies = async (pageNum: number, isNewFilter: boolean = false) => {
//     try {
//       setLoading(true);
      
//       const params = new URLSearchParams({
//         page: pageNum.toString(),
//         sort_by: activeFilters.sort,
//         ...(activeFilters.year && { year: activeFilters.year }),
//         ...(activeFilters.genre.length > 0 && { 
//           with_genres: activeFilters.genre.join(',') 
//         }),
//       });

//       const response = await fetch(
//         `https://api.themoviedb.org/3/discover/movie?${params.toString()}`,
//         {
//           headers: {
//             Authorization: `Bearer ${process.env.NEXT_PUBLIC_TMDB_API_READ_ACCESS_TOKEN}`,
//           },
//         }
//       );

//       if (!response.ok) {
//         throw new Error('Failed to fetch movies');
//       }

//       const data = await response.json();

//       if (isNewFilter) {
//         setMovies(data.results);
//       } else {
//         setMovies(prev => [...prev, ...data.results]);
//       }

//       setTotalResults(data.total_results);
//       setHasMore(data.page < data.total_pages);
//       setPage(pageNum);
//     } catch (error) {
//       
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchMovies(1, true);
//   }, [activeFilters]); // Refetch when filters change

//   const handleFilterChange = (newFilters: FilterState) => {
//     setActiveFilters(newFilters);
//     setPage(1); // Reset to first page when filters change
//   };

//   const loadMore = () => {
//     if (!loading && hasMore) {
//       fetchMovies(page + 1);
//     }
//   };

//   if (loading && movies.length === 0) {
//     return (
//       <div className="flex justify-center items-center min-h-[50vh]">
//         <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
//       </div>
//     );
//   }

//   return (
//     <div className="px-4 md:px-8 pb-8">
//       <MovieFilters onFilterChange={handleFilterChange} />
      
//       <div className="max-w-8xl mx-auto">
//         <InfiniteScroll
//           dataLength={movies.length}
//           next={loadMore}
//           hasMore={hasMore}
//           loader={
//             <div className="flex justify-center py-4">
//               <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
//             </div>
//           }
//           endMessage={
//             <motion.div 
//               initial={{ opacity: 0 }}
//               animate={{ opacity: 1 }}
//               className="text-center py-8"
//             >
//               {movies.length > 0 ? (
//                 <div className="space-y-2">
//                   <p className="text-lg font-medium text-gray-300">
//                     That's all folks! 🎬
//                   </p>
//                   <p className="text-sm text-gray-400">
//                     You've viewed all {totalResults} movies in this category
//                   </p>
//                 </div>
//               ) : (
//                 <div className="space-y-2">
//                   <p className="text-lg font-medium text-gray-300">
//                     No movies found 😢
//                   </p>
//                   <p className="text-sm text-gray-400">
//                     Try adjusting your filters to find more movies
//                   </p>
//                 </div>
//               )}
//             </motion.div>
//           }
//           className="space-y-8"
//         >
//           <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
//             {movies.map((movie, index) => (
//               <motion.div
//                 key={movie.id}
//                 initial={{ opacity: 0, y: 20 }}
//                 animate={{ opacity: 1, y: 0 }}
//                 transition={{ duration: 0.3, delay: index * 0.05 }}
//               >
//                 <MovieCard movie={movie} />
//               </motion.div>
//             ))}
//           </div>
//         </InfiniteScroll>
//       </div>
//     </div>
//   );
// }