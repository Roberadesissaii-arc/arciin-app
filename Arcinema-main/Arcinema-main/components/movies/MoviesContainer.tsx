"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useTrailer } from "@/hooks/useTrailer";
import { CountryIndicator } from "@/components/ui/country-indicator";
import { getFilterConfig, filterSearchResults, isAdultContent } from "@/lib/features/filters/contentFilter";
import { 
  Film, 
  Clapperboard, 
  Calendar, 
  Award, 
  ChevronDown,
  Filter,
  Star,
  Play,
  Info
} from "lucide-react";
import { doc, getDoc } from 'firebase/firestore';
import { projectFirestore as db } from '@/firebase/config';
import MovieGrid from "@/components/movies/MovieGrid";
import FilterPanel from "@/components/movies/filters/FilterPanel";
import TrailerModal from "@/components/ui/trailer-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { getGenreFont } from "@/lib/features/media/genreFonts";
const sections = [
  { 
    id: "popular", 
    label: "Popular", 
    icon: Film,
    description: "Most watched movies right now",
    gradient: "from-red-500 via-orange-500 to-yellow-500"
  },
  { 
    id: "now_playing", 
    label: "Now Playing", 
    icon: Clapperboard,
    description: "Currently in theaters",
    gradient: "from-blue-500 via-indigo-500 to-purple-500"
  },
  { 
    id: "upcoming", 
    label: "Upcoming", 
    icon: Calendar,
    description: "Coming soon to theaters",
    gradient: "from-green-500 via-emerald-500 to-teal-500"
  },
  { 
    id: "top_rated", 
    label: "Top Rated", 
    icon: Award,
    description: "Highest rated of all time",
    gradient: "from-purple-500 via-pink-500 to-rose-500"
  },
];

const defaultFilters = {
  genres: [] as number[],
  rating: 0,
  year: null,
  sortBy: 'popularity',
  sortOrder: 'desc' as const,
  language: '',
  adult: false,
};

interface BackgroundImage {
  id: number;
  backdrop_path: string;
  title: string;
  overview: string;
  release_date: string;
  vote_average: number;
  genres?: Array<{ id: number; name: string }>;
}

export default function MoviesContainer() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const { settings } = useUserSettings();
  const trailer = useTrailer();
  const [activeSection, setActiveSection] = useState(() => {
    // Restore last selected category from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('movies_activeSection');
      if (saved) {
        const savedSection = sections.find(s => s.id === saved);
        if (savedSection) return savedSection;
      }
    }
    return sections[0];
  });
  const [filters, setFilters] = useState(defaultFilters);
  const [showFilters, setShowFilters] = useState(false);

  // Save active section to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('movies_activeSection', activeSection.id);
    }
  }, [activeSection]);

  // Update showFilters when filters change
  useEffect(() => {
    const hasActiveFilters = filters.genres.length > 0 || filters.year || filters.rating > 0;
    setShowFilters(hasActiveFilters);
  }, [filters]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userPreferences, setUserPreferences] = useState<Record<string, unknown> | null>(null);
  const [featuredMovie, setFeaturedMovie] = useState<BackgroundImage | null>(null);
  const [isLoadingFeatured, setIsLoadingFeatured] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Calculate genre-based font for featured movie title (with media ID for variety)
  const titleFont = useMemo(() => {
    if (!featuredMovie?.genres || featuredMovie.genres.length === 0) {
      return 'font-cinzel-decorative';
    }
    return getGenreFont(featuredMovie.genres, featuredMovie.id);
  }, [featuredMovie?.genres, featuredMovie?.id]);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const loadUserPreferences = async () => {
      if (!user) return;

      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userDocRef);

        if (userSnap.exists()) {
          setUserPreferences(userSnap.data());
        }
      } catch (error: unknown) {
        toast({
          title: "Error",
          description: "Failed to load preferences",
          variant: "destructive",
        });
      }
    };

    loadUserPreferences();
  }, [user, toast]);

  useEffect(() => {
    const fetchFeaturedMovie = async () => {
      setIsLoadingFeatured(true);
      try {
        const endpoint = activeSection.id === 'popular' ? 'popular' : 
                        activeSection.id === 'now_playing' ? 'now_playing' : 
                        activeSection.id === 'upcoming' ? 'upcoming' : 'top_rated';
        
        const country = settings.preferences.country || 'all';
        const contentFilter = settings.preferences.contentFilter || 'filtered';
        const filterConfig = getFilterConfig(contentFilter);
        const regionParam = country !== 'all' ? `&region=${country}` : '';
        
        const response = await fetch(
          `https://api.themoviedb.org/3/movie/${endpoint}?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}&language=en-US&page=1&include_adult=${filterConfig.includeAdult}${regionParam}`
        );
        const data = await response.json();
        let results = data.results || [];
        
        // Apply content filtering before selecting a featured movie
        const contentFilterLevel = settings.preferences.contentFilter || 'filtered';
        if (contentFilterLevel !== 'all') {
          results = filterSearchResults(results, contentFilterLevel);
          // Additional filtering for adult content detection
          results = results.filter((movie: any) => !isAdultContent(movie));
        }
        
        if (results.length > 0) {
          const randomIndex = Math.floor(Math.random() * Math.min(5, results.length));
          const selectedMovie = results[randomIndex];
          
          // Fetch full movie details to get genres
          try {
            const detailsResponse = await fetch(
              `https://api.themoviedb.org/3/movie/${selectedMovie.id}?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}&language=en-US`
            );
            const movieDetails = await detailsResponse.json();
            setFeaturedMovie(movieDetails);
          } catch (error) {
            setFeaturedMovie(selectedMovie);
          }
        }
      } catch (error) {
      } finally {
        setIsLoadingFeatured(false);
      }
    };

    fetchFeaturedMovie();
  }, [activeSection.id, settings.preferences.contentFilter, settings.preferences.country]);

  // Listen for genre filter changes from navbar
  useEffect(() => {
    const handleGenreFilter = (event: CustomEvent) => {
      const { genreId, categoryTitle } = event.detail;
      
      // Update filters to include the selected genre
      setFilters(prev => ({
        ...prev,
        genres: [genreId]
      }));
      
      // Show filters panel to indicate filtering is active
      setShowFilters(true);
      
      // Show a toast to indicate the filter was applied
      toast({
        title: `Filtering by ${categoryTitle}`,
        description: `Showing ${categoryTitle.toLowerCase()} movies`,
      });
    };

    window.addEventListener('genreFilterChange', handleGenreFilter as EventListener);
    
    return () => {
      window.removeEventListener('genreFilterChange', handleGenreFilter as EventListener);
    };
  }, [toast]);

  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
  };

  // const handleFilterReset = () => {
  //   setFilters(defaultFilters);
  // };

  return (
    <div className="min-h-screen bg-black overflow-x-hidden max-w-full">
      {/* Hero Section */}
      <div className="relative h-[70vh] sm:h-[60vh] overflow-hidden">
        {/* Mobile top padding to avoid navigation overlap */}
        <div className="h-20 sm:h-0" />
        
        <AnimatePresence mode="wait">
          <motion.div
            key={featuredMovie?.id || activeSection.id}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Background Image - pushed down for glassy effect */}
            {featuredMovie && (
              <motion.div 
                className="absolute inset-0"
                initial={{ scale: 1.1, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                <Image
                  src={`https://image.tmdb.org/t/p/original${featuredMovie.backdrop_path}`}
                  alt={featuredMovie.title}
                  fill
                  className={cn(
                    "object-cover object-center",
                    isLoadingFeatured && "animate-pulse"
                  )}
                  priority
                  onLoad={() => setIsLoadingFeatured(false)}
                />
              </motion.div>
            )}

            {/* Gradient Overlay - Section-based when no featured movie */}
            <div 
              className={cn(
                "absolute inset-0 opacity-30",
                !featuredMovie && "bg-gradient-to-br",
                !featuredMovie && activeSection.gradient
              )} 
            />
            
            {/* Enhanced Dark Overlays for glassy look */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

            {/* Content - with proper mobile spacing */}
            <div className="absolute inset-0 flex items-center pt-32 sm:pt-0">
              <div className="w-full px-4 sm:px-12">
                <div className="max-w-2xl space-y-4 sm:space-y-6">
                  {featuredMovie ? (
                    <>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-3 sm:space-y-4"
                      >
                        <div className="flex items-center gap-2">
                          <Badge className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-3 py-1 text-xs sm:text-sm">
                            Featured Movie
                          </Badge>
                        </div>
                        
                        <h1 className={cn(
                          "text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold line-clamp-2 leading-tight",
                          titleFont
                        )}>
                          {featuredMovie.title}
                        </h1>
                        
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm">
                          <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-500 text-xs sm:text-sm">
                            <Star className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                            {featuredMovie.vote_average.toFixed(1)}
                          </Badge>
                          
                          {featuredMovie.release_date && (
                            <Badge variant="secondary" className="bg-white/10 text-xs sm:text-sm">
                              {new Date(featuredMovie.release_date).getFullYear()}
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-sm sm:text-base lg:text-lg text-gray-300 line-clamp-2 sm:line-clamp-3">
                          {featuredMovie.overview}
                        </p>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4"
                      >
                        <Button 
                          size="lg" 
                          className="w-full sm:w-auto relative overflow-hidden bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:via-indigo-400 hover:to-indigo-500 text-white font-medium
                                   before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent
                                   px-6 sm:px-8 py-3 text-base rounded-md shadow-lg"
                          onClick={() => trailer.fetchTrailer(
                            featuredMovie.id, 
                            featuredMovie.title, 
                            'movie'
                          )}
                          disabled={trailer.isLoading}
                        >
                          <span className="relative z-10 flex items-center gap-2">
                            <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-white" />
                            {trailer.isLoading ? 'Loading...' : <><span className="hidden sm:inline">Watch </span>Trailer</>}
                          </span>
                        </Button>
                        <Button 
                          size="lg" 
                          variant="outline" 
                          className="rounded-md bg-white/10 backdrop-blur-md hover:bg-white/20 border border-white/20 text-white 
                                   w-full sm:w-auto text-sm sm:text-base px-6 sm:px-8 py-3 transition-all"
                          onClick={() => router.push(`/movies/${featuredMovie.id}`)}
                        >
                          <Info className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                          More Info
                        </Button>
                      </motion.div>
                    </>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4 sm:space-y-6"
                    >
                      <div className="flex items-center gap-3 sm:gap-4">
                        <activeSection.icon className={cn(
                          "w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12",
                          !featuredMovie && "text-white"
                        )} />
                        <h1 className={cn(
                          "text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold",
                          "bg-clip-text text-transparent bg-gradient-to-r",
                          activeSection.gradient
                        )}>
                          {activeSection.label}
                        </h1>
                      </div>
                      
                      <p className="text-base sm:text-lg lg:text-xl text-gray-300">
                        {activeSection.description}
                      </p>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Main Content */}
      <div className="relative z-10 mt-4 sm:-mt-16 lg:-mt-20 overflow-x-hidden">
        <div className="w-full pt-4 sm:pt-8 overflow-x-hidden">
          {/* Page Header - Above Controls */}
          <div className="mb-6 px-4 sm:px-12">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              Discover Movies
            </h1>
            <p className="text-sm sm:text-base text-gray-400 mt-1 line-clamp-1">
              Explore trending, popular, upcoming, and top-rated movies
            </p>
          </div>

          {/* Controls Section */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between mb-4 gap-4 px-4 sm:px-12">
            {/* Mobile Controls - Side by Side */}
            <div className="lg:hidden flex gap-3 w-full z-50">
              {/* Mobile Section Selector */}
              <div className="relative flex-1" ref={mobileMenuRef}>
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="w-full p-3 flex items-center justify-between 
                           bg-black/50 backdrop-blur-md border border-white/10 
                           rounded-xl hover:bg-white/10 transition-all"
                >
                  <div className="flex items-center gap-2">
                    {activeSection.icon && <activeSection.icon className="w-4 h-4" />}
                    <span className="text-sm font-medium truncate">{activeSection.label}</span>
                  </div>
                  <ChevronDown className={cn(
                    "w-4 h-4 transition-transform duration-200 flex-shrink-0",
                    isMobileMenuOpen && "rotate-180"
                  )} />
                </button>

                <AnimatePresence>
                  {isMobileMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 0 }}
                      animate={{ opacity: 1, y: 8 }}
                      exit={{ opacity: 0, y: 0 }}
                      className="absolute top-full left-0 right-0
                               bg-black/95 backdrop-blur-md border border-white/10 
                               rounded-xl overflow-hidden shadow-xl"
                      style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}
                    >
                      {sections.map((section) => {
                        const Icon = section.icon;
                        return (
                          <button
                            key={section.id}
                            onClick={() => {
                              setActiveSection(section);
                              setIsMobileMenuOpen(false);
                            }}
                            className={cn(
                              "w-full flex items-center gap-3 p-3 transition-all",
                              "hover:bg-white/5",
                              activeSection.id === section.id && "bg-indigo-500/20"
                            )}
                          >
                            <Icon className="w-4 h-4" />
                            <div className="flex flex-col items-start">
                              <span className="font-medium text-sm">{section.label}</span>
                              <span className="text-xs text-gray-400">
                                {section.description}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Mobile Filter Button */}
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "px-4 h-auto py-3 flex-shrink-0",
                  showFilters && "bg-indigo-500 hover:bg-indigo-600 text-white border-indigo-500"
                )}
              >
                <Filter className="w-4 h-4" />
              </Button>
            </div>

            {/* Desktop Menu */}
            <div className="hidden lg:flex gap-2 flex-wrap">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <Button
                    key={section.id}
                    variant={activeSection.id === section.id ? "default" : "outline"}
                    onClick={() => setActiveSection(section)}
                    className={cn(
                      "gap-2 text-sm transition-all",
                      activeSection.id === section.id && 
                        "bg-indigo-500 hover:bg-indigo-600 text-white border-indigo-500"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{section.label}</span>
                  </Button>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 lg:gap-4">
              {/* Country Indicator */}
              <div className="hidden sm:flex items-center">
                <CountryIndicator country={settings.preferences.country || 'all'} />
              </div>

              {/* Desktop Filter Toggle */}
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "gap-2 hidden lg:flex",
                  showFilters && "bg-indigo-500 hover:bg-indigo-600 text-white"
                )}
              >
                <Filter className="w-4 h-4" />
                <span>Filters</span>
              </Button>
            </div>
          </div>

          {/* Filter Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mb-4"
              >
                <FilterPanel
                  filters={filters}
                  onFilterChange={handleFilterChange}
                  mediaType="movie"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Content */}
          <div className="bg-black/50 backdrop-blur-sm border border-white/10 rounded-none sm:rounded-xl p-6 overflow-x-hidden" data-movie-section>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="w-full overflow-x-hidden"
            >
              <MovieGrid
                section={activeSection.id}
                mediaType="movie"
                filters={filters}
                initialCount={20}
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-6"
              />
            </motion.div>
          </div>
        </div>
      </div>

      {/* Trailer Modal */}
      <TrailerModal
        isOpen={trailer.isModalOpen}
        onClose={trailer.closeModal}
        trailerUrl={trailer.trailerUrl}
        title={trailer.movieTitle}
      />
    </div>
  );
}