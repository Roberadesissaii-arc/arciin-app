"use client";

import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useTrailer } from "@/hooks/useTrailer";
import { getFilterConfig, filterSearchResults, isAdultContent } from "@/lib/features/filters/contentFilter";
import { Film, Tv2, CalendarDays } from "lucide-react";
import FilterPanel from "@/components/movies/filters/FilterPanel";
import TrailerModal from "@/components/ui/trailer-modal";
import { useToast } from "@/components/ui/use-toast";
import { doc, getDoc } from 'firebase/firestore';
import { projectFirestore } from '@/firebase/config';
import NewReleasesHero from "./hero/NewReleasesHero";
import NewReleasesControls from "./NewReleasesControls";
import NewReleasesContent from "./NewReleasesContent";

const sections = [
  { 
    id: "now_playing", 
    label: "In Theaters", 
    type: "movie" as const,
    icon: Film,
    description: "Latest movies in theaters now",
    gradient: "from-red-500 via-orange-500 to-yellow-500"
  },
  { 
    id: "airing_today", 
    label: "On TV Today", 
    type: "tv" as const,
    icon: Tv2,
    description: "Latest episodes airing today",
    gradient: "from-blue-500 via-indigo-500 to-purple-500"
  },
  { 
    id: "upcoming", 
    label: "Coming Soon", 
    type: "movie" as const,
    icon: CalendarDays,
    description: "Upcoming releases to watch out for",
    gradient: "from-green-500 via-emerald-500 to-teal-500"
  },
];

const defaultFilters = {
  genres: [],
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
  title?: string;
  name?: string;
  overview: string;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  genres?: Array<{ id: number; name: string }>;
}

export default function NewReleasesContainer() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { settings } = useUserSettings();
  const trailer = useTrailer();
  const [activeSection, setActiveSection] = useState(sections[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState(defaultFilters);
  const [isOffline, setIsOffline] = useState(false);
  const [featuredItem, setFeaturedItem] = useState<BackgroundImage | null>(null);
  const [isLoadingFeatured, setIsLoadingFeatured] = useState(false);
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

  // Check online status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOffline(!navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load user preferences
  useEffect(() => {
    const loadUserPreferences = async () => {
      if (!user) return;

      try {
        const userRef = doc(projectFirestore, 'users', user.uid);
        const userSnap = await getDoc(userRef);
      } catch (error: unknown) {
        if (!isOffline) {
          toast({
            title: "Error",
            description: "Failed to load preferences. Please try again.",
            variant: "destructive",
          });
        }
      }
    };

    loadUserPreferences();
  }, [user, isOffline, toast]);

  useEffect(() => {
    const fetchFeaturedItem = async () => {
      setIsLoadingFeatured(true);
      try {
        const endpoint = activeSection.id === 'upcoming' ? 'upcoming' : 
                        activeSection.id === 'now_playing' ? 'now_playing' : 'airing_today';
        
        const country = settings.preferences.country || 'all';
        const contentFilter = settings.preferences.contentFilter || 'filtered';
        const filterConfig = getFilterConfig(contentFilter);
        const regionParam = country !== 'all' ? `&region=${country}` : '';
        
        const response = await fetch(
          `https://api.themoviedb.org/3/${activeSection.type}/${endpoint}?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}&language=en-US&page=1&include_adult=${filterConfig.includeAdult}${regionParam}`
        );
        const data = await response.json();
        let results = data.results || [];
        
        const contentFilterLevel = settings.preferences.contentFilter || 'filtered';
        if (contentFilterLevel !== 'all') {
          results = filterSearchResults(results, contentFilterLevel);
          results = results.filter((item: any) => !isAdultContent(item));
        }
        
        if (results.length > 0) {
          const randomIndex = Math.floor(Math.random() * Math.min(5, results.length));
          const selectedItem = results[randomIndex];
          
          // Fetch full details to get genres
          try {
            const detailsResponse = await fetch(
              `https://api.themoviedb.org/3/${activeSection.type}/${selectedItem.id}?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}&language=en-US`
            );
            const itemDetails = await detailsResponse.json();
            setFeaturedItem(itemDetails);
          } catch (error) {
            setFeaturedItem(selectedItem);
          }
        }
      } catch (error) {
      } finally {
        setIsLoadingFeatured(false);
      }
    };

    fetchFeaturedItem();
  }, [activeSection.id, activeSection.type, settings.preferences.contentFilter, settings.preferences.country]);

  const handleSectionChange = (sectionId: string) => {
    setIsLoading(true);
    const section = sections.find(s => s.id === sectionId);
    if (section) {
      setActiveSection(section);
      setFilters(prev => ({
        ...defaultFilters,
        sortBy: prev.sortBy,
        sortOrder: prev.sortOrder
      }));
    }
    setIsMobileMenuOpen(false);
    setTimeout(() => setIsLoading(false), 300);
  };

  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
  };

  const OfflineBanner = () => (
    <div className="bg-yellow-500/10 border-l-4 border-yellow-500 p-4 mb-4">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <p className="text-sm text-yellow-500">
            You&apos;re currently offline. Some features may be limited.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black overflow-x-hidden max-w-full">
      {isOffline && <OfflineBanner />}

      {/* Hero Section */}
      <AnimatePresence mode="wait">
        <NewReleasesHero
          featuredItem={featuredItem}
          activeSection={activeSection}
          isLoadingFeatured={isLoadingFeatured}
          onTrailerClick={() => trailer.fetchTrailer(
            featuredItem?.id || 0,
            featuredItem?.title || featuredItem?.name || '',
            activeSection.type
          )}
          isTrailerLoading={trailer.isLoading}
        />
      </AnimatePresence>

      {/* Main Content */}
      <div className="relative z-10 mt-4 sm:-mt-16 lg:-mt-20 overflow-x-hidden">
        <div className="w-full pt-4 sm:pt-8 overflow-x-hidden">
          {/* Page Header */}
          <div className="mb-6 px-4 sm:px-12">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              New Releases
            </h1>
            <p className="text-sm sm:text-base text-gray-400 mt-1 line-clamp-1">
              Discover what&apos;s new in theaters, on TV, and coming soon
            </p>
          </div>

          {/* Controls Section */}
          <div className="px-4 sm:px-12">
            <NewReleasesControls
              sections={sections}
              activeSection={activeSection}
              onSectionChange={handleSectionChange}
              showFilters={showFilters}
              onFilterToggle={() => setShowFilters(!showFilters)}
              isMobileMenuOpen={isMobileMenuOpen}
              onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              mobileMenuRef={mobileMenuRef}
              isOffline={isOffline}
            />

            {/* Filter Panel */}
            <AnimatePresence>
              {showFilters && !isOffline && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mb-4"
                >
                  <FilterPanel
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    mediaType={activeSection.type}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Content */}
          <NewReleasesContent
            activeSection={activeSection}
            filters={filters}
            isLoading={isLoading}
          />
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
