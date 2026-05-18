"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { getGenreFont } from "@/lib/features/media/genreFonts";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useTrailer } from "@/hooks/useTrailer";
import { filterSearchResults, isAdultContent } from "@/lib/features/filters/contentFilter";
import { filterByProductionCountry } from "@/lib/features/filters/regionFilter";
import { 
  Star, 
  TrendingUp,
  Calendar,
  Filter,
  ChevronDown,
  Tv,
  LucideIcon,
  Play,
  Info 
} from "lucide-react";
import { doc, getDoc } from 'firebase/firestore';
import { projectFirestore as db } from '@/firebase/config';
import TVShowGrid from "./TVShowGrid";
import FilterPanel from "./filters/FilterPanel";
import TrailerModal from "@/components/ui/trailer-modal";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Section {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  gradient: string;
}

interface Genre {
  id: number;
  name: string;
}

interface FeaturedShow {
  id: number;
  name: string;
  vote_average: number;
  first_air_date: string;
  overview: string;
  genres?: Genre[];
  backdrop_path: string;
}

const sections: Section[] = [
  { 
    id: "popular", 
    label: "Popular Shows",
    description: "Currently trending TV shows",
    icon: TrendingUp,
    gradient: "from-pink-500 via-purple-500 to-indigo-500"
  },
  { 
    id: "on_the_air", 
    label: "On TV",
    description: "Shows currently airing",
    icon: Tv,
    gradient: "from-blue-500 via-cyan-500 to-teal-500"
  },
  { 
    id: "airing_today", 
    label: "Airing Today",
    description: "New episodes today",
    icon: Calendar,
    gradient: "from-green-500 via-emerald-500 to-lime-500"
  },
  { 
    id: "top_rated", 
    label: "Top Rated",
    description: "Highest rated TV shows",
    icon: Star,
    gradient: "from-orange-500 via-amber-500 to-yellow-500"
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

export default function TVShowContainer() {
  const { user } = useAuth();
  const router = useRouter();
  const { settings } = useUserSettings();
  const { toast } = useToast();
  const trailer = useTrailer();
  const [activeSection, setActiveSection] = useState(sections[0]);
  const [filters, setFilters] = useState(defaultFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

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

  // Update showFilters when filters change
  useEffect(() => {
    const hasActiveFilters = filters.genres.length > 0 || filters.year || filters.rating > 0;
    setShowFilters(hasActiveFilters);
  }, [filters]);

  const [userPreferences, setUserPreferences] = useState<Record<string, unknown> | null>(null);
  const [featured, setFeatured] = useState<FeaturedShow | null>(null);

  // Calculate genre-based font for featured show title (with media ID for variety)
  const titleFont = useMemo(() => {
    if (!featured?.genres || featured.genres.length === 0) {
      return 'font-cinzel-decorative';
    }
    return getGenreFont(featured.genres, featured.id);
  }, [featured?.genres, featured?.id]);

  // Load user preferences
  useEffect(() => {
    const loadUserPreferences = async () => {
      if (!user) return;
      try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUserPreferences(userSnap.data());
        }
      } catch (error) {
      }
    };
    loadUserPreferences();
  }, [user]);

  // Fetch featured show based on active section
  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        let endpoint = '';
        
        // Map section IDs to correct API endpoints
        switch (activeSection.id) {
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

        const response = await fetch(
          `https://api.themoviedb.org/3${endpoint}?language=en-US&page=1&include_adult=${settings?.preferences?.contentFilter === 'all'}&region=${settings?.preferences?.country || 'US'}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_TMDB_API_READ_ACCESS_TOKEN}`,
            },
          }
        );
        const data = await response.json();
        if (data.results?.length > 0) {
          // Apply content filtering before selecting a featured show
          const contentFilterLevel = settings?.preferences?.contentFilter || 'filtered';
          const preferredCountry = settings?.preferences?.country || 'US';
          let filteredResults = data.results;
          
          if (contentFilterLevel !== 'all') {
            filteredResults = filterSearchResults(data.results, contentFilterLevel);
            // Additional filtering for adult content detection
            filteredResults = filteredResults.filter((show: any) => !isAdultContent(show));
          }
          
          // Apply regional filtering to prioritize preferred country content
          if (preferredCountry && preferredCountry !== 'all') {
            filteredResults = filterByProductionCountry(filteredResults, preferredCountry);
          }
          
          if (filteredResults.length > 0) {
            // Get a random show from the filtered results
            const randomIndex = Math.floor(Math.random() * Math.min(5, filteredResults.length));
            const selectedShow = filteredResults[randomIndex];
          
            // Get full details of the selected show
            const showResponse = await fetch(
              `https://api.themoviedb.org/3/tv/${selectedShow.id}?append_to_response=credits,videos&include_adult=${settings?.preferences?.contentFilter === 'all'}`,
              {
                headers: {
                  Authorization: `Bearer ${process.env.NEXT_PUBLIC_TMDB_API_READ_ACCESS_TOKEN}`,
                },
              }
            );
            const showData = await showResponse.json();
            setFeatured(showData);
          }
        }
      } catch (error) {
      }
    };
    fetchFeatured();
  }, [activeSection.id, settings?.preferences?.contentFilter]);

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
      const preferredCountry = settings?.preferences?.country || 'US';
      const countryName = preferredCountry === 'US' ? 'American' : 
                         preferredCountry === 'GB' ? 'British' :
                         preferredCountry === 'CA' ? 'Canadian' :
                         preferredCountry === 'AU' ? 'Australian' :
                         'English-language';
      
      const enhancedDescription = categoryTitle === 'Romance' || categoryTitle === 'Drama' 
        ? `Filtering by ${categoryTitle} - showing high-quality ${countryName} TV shows only`
        : `Filtering by ${categoryTitle} TV shows (${countryName} content prioritized)`;
      
      toast({
        title: "Enhanced TV Filter Applied",
        description: enhancedDescription,
        duration: 3000,
      });
    };

    window.addEventListener('genreFilterChange', handleGenreFilter as EventListener);
    
    return () => {
      window.removeEventListener('genreFilterChange', handleGenreFilter as EventListener);
    };
  }, [toast, settings?.preferences?.country]);

  return (
    <div className="min-h-screen bg-black overflow-x-hidden max-w-full">
      {/* Hero Section */}
      <div className="relative h-[70vh] sm:h-[60vh] overflow-hidden">
        {/* Mobile top padding to avoid navigation overlap */}
        <div className="h-20 sm:h-0" />
        
        <AnimatePresence mode="wait">
          {featured && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
            >
              {/* Background Image */}
              <div className="absolute inset-0">
                <Image
                  src={`https://image.tmdb.org/t/p/original${featured.backdrop_path}`}
                  alt={featured.name}
                  fill
                  className="w-full h-full object-cover object-center"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/50" />
              </div>

            {/* Content - with proper mobile spacing */}
            <div className="absolute inset-0 flex items-center pt-32 sm:pt-0">
              <div className="w-full px-4 sm:px-12">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="max-w-2xl space-y-4 sm:space-y-6"
                  >
                    <Badge 
                      className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-3 py-1 text-xs sm:text-sm"
                    >
                      Featured Show
                    </Badge>

                    <h1 className={cn(
                      "text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold line-clamp-3 leading-tight",
                      titleFont
                    )}>
                      {featured.name}
                    </h1>

                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm">
                      <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-500 text-xs sm:text-sm">
                        <Star className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                        {(featured.vote_average || 0).toFixed(1)}
                      </Badge>
                      
                      {featured.first_air_date && (
                        <Badge variant="secondary" className="bg-white/10 text-xs sm:text-sm">
                          {new Date(featured.first_air_date).getFullYear()}
                        </Badge>
                      )}
                      
                      {featured.genres?.slice(0, 2).map((genre: Genre) => (
                        <Badge 
                          key={genre.id}
                          variant="secondary" 
                          className="bg-blue-500/20 text-blue-500 text-xs sm:text-sm"
                        >
                          {genre.name}
                        </Badge>
                      ))}
                    </div>

                    <p className="text-sm sm:text-base lg:text-lg text-gray-300 line-clamp-2 sm:line-clamp-3">
                      {featured.overview}
                    </p>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4"
                    >
                      <Button 
                        size="lg" 
                        className="w-full sm:w-auto relative overflow-hidden bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:via-indigo-400 hover:to-indigo-500 text-white font-medium
                                 before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent
                                 px-6 sm:px-8 py-3 text-base rounded-md shadow-lg"
                        onClick={() => trailer.fetchTrailer(
                          featured.id, 
                          featured.name, 
                          'tv'
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
                        onClick={() => router.push(`/tv-shows/${featured.id}`)}
                      >
                        <Info className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                        More Info
                      </Button>
                    </motion.div>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Content */}
      <div className="relative z-10 mt-4 sm:-mt-16 lg:-mt-20 overflow-x-hidden">
        <div className="w-full pt-4 sm:pt-8 overflow-x-hidden">
          {/* Page Header - Above Controls */}
          <div className="mb-6 px-4 sm:px-12">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              Discover TV Shows
            </h1>
            <p className="text-sm sm:text-base text-gray-400 mt-1 line-clamp-1">
              Explore trending, popular, and top-rated TV shows
            </p>
          </div>

          {/* Controls Section */}
          <div className="flex items-center justify-between mb-4 px-4 sm:px-12">
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
            <div className="hidden lg:flex gap-2">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <Button
                    key={section.id}
                    variant={activeSection.id === section.id ? "default" : "outline"}
                    onClick={() => setActiveSection(section)}
                    className={cn(
                      "gap-2 transition-all",
                      activeSection.id === section.id && 
                        "bg-indigo-500 hover:bg-indigo-600 text-white border-indigo-500"
                    )}
                  >
                    {Icon && <Icon className="w-4 h-4" />}
                    <span>{section.label}</span>
                  </Button>
                );
              })}
            </div>

            {/* Filter Toggle */}
            <Button
              variant={"outline"}
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "gap-2 hidden lg:flex",
                showFilters && "bg-indigo-500 hover:bg-indigo-600 text-white"
              )}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Filters</span>
            </Button>
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
                  onFilterChange={setFilters}
                  mediaType="tv"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Content */}
          <div className="bg-black/50 backdrop-blur-sm border border-white/10 rounded-none sm:rounded-xl p-6 overflow-x-hidden" data-tv-section>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="w-full overflow-x-hidden"
            >
              <TVShowGrid
                section={activeSection.id}
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
