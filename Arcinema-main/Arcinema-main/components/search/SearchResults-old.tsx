// components/search/SearchResults.tsx
"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Search, ArrowLeft, Film, Tv, User, Globe, Settings, Shield, Monitor, Ban, TrendingUp, Star, Play, Clock, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useActivityTracking } from "@/hooks/useActivityTracking";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import { blockPersonForAdmin, unblockPersonForAdmin, isPersonBlocked, isAdmin } from "@/lib/firebase/userBlockedContent";
import BlockConfirmDialog from "@/components/ui/BlockConfirmDialog";
import { toast } from "@/components/ui/use-toast";
import { CountryIndicator } from "@/components/ui/country-indicator";
import { searchMovies, searchTVShows, searchPeople, searchAnime } from "@/lib/api";
import { getFilterConfig, filterSearchResults, isSearchQueryAppropriate } from "@/lib/features/filters/contentFilter";
import { filterAndSortResults } from "@/lib/utils/searchUtils";
import { filterByProductionCountry, getCountryPriorityScore } from "@/lib/features/filters/regionFilter";
import { batchFilterMedia } from "@/lib/features/filters/advancedFilters";
import { filterBlockedContent } from "@/lib/firebase/blockedContent";
import MoviePlaceholder from "@/components/movies/cards/MoviePlaceholder";
import SearchCard from "@/components/search/SearchCard";
import SearchInput from "@/components/search/SearchInput";
import { Button } from "@/components/ui/button";
import Image from "next/image";

interface SearchResult {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path?: string;
  profile_path?: string;
  release_date?: string;
  first_air_date?: string;
  media_type: 'movie' | 'tv' | 'person' | 'anime';
  vote_average?: number;
  genre_ids?: number[];
  origin_country?: string[];
  original_language?: string;
}

export default function SearchResults() {
  const { user } = useAuth();
  const { settings } = useUserSettings();
  const { trackSearch } = useActivityTracking();
  const { addSearch } = useSearchHistory();
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || '';
  
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalResults, setTotalResults] = useState(0);
  
  // Admin blocking functionality
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [personToBlock, setPersonToBlock] = useState<SearchResult | null>(null);
  const [isBlockLoading, setIsBlockLoading] = useState(false);
  const [blockedPersons, setBlockedPersons] = useState<Set<number>>(new Set());
  
  const userIsAdmin = user ? isAdmin(user.email) : false;

  useEffect(() => {
    const performSearch = async () => {
      if (!query.trim()) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const country = settings?.preferences?.country || 'all';
        const contentFilter = settings?.preferences?.contentFilter || 'filtered';
        
        // Check if the search query is appropriate for the current filter level
        if (!isSearchQueryAppropriate(query, contentFilter)) {
          setResults([]);
          setTotalResults(0);
          setError(`This search term is not allowed in ${contentFilter === 'kids' ? 'Kids Mode' : 'Filtered Mode'}. Please try a different search.`);
          return;
        }
        
        const filterConfig = getFilterConfig(contentFilter);
        
        // Fetch multiple pages to get more results
        const fetchMultiplePages = async (searchFn: Function, maxPages = 5) => {
          const allResults = [];
          let totalFound = 0;
          
          for (let page = 1; page <= maxPages; page++) {
            try {
              const response = await searchFn(query, filterConfig.includeAdult, country, page);
              if (response.results && response.results.length > 0) {
                allResults.push(...response.results);
                totalFound = response.total_results;
                
                // If we got less than 20 results, there are no more pages
                if (response.results.length < 20) break;
              } else {
                break;
              }
            } catch (error) {
              break;
            }
          }
          
          return { results: allResults, total_results: totalFound };
        };

        // Use the new API functions with country filtering and multiple pages
        const [movieResults, tvResults, peopleResults, animeResults] = await Promise.all([
          fetchMultiplePages(searchMovies),
          fetchMultiplePages(searchTVShows),
          searchPeople(query, filterConfig.includeAdult, 1), // People search single page for now
          searchAnime(query, 1, { sfw: !filterConfig.includeAdult }) // Anime search
        ]);

        const allResults: SearchResult[] = [];
        let totalCount = 0;
        
        // Add movie results with advanced filtering
        if (movieResults.results) {
          // Apply basic content filter first
          let filteredMovies = filterSearchResults(movieResults.results, contentFilter);
          
          // Apply country filtering if a specific country is selected
          if (country !== 'all') {
            filteredMovies = filterByProductionCountry(filteredMovies, country);
          }
          
          const relevantMovies = filterAndSortResults(filteredMovies, query);
          
          // Apply advanced content filtering (smart algorithm with rating + popularity)
          const advancedFilteredMovies = await batchFilterMedia(
            relevantMovies,
            {
              language: settings?.preferences?.language === 'all' ? undefined : settings?.preferences?.language,
              country: country === 'all' ? undefined : country,
              contentFilter: contentFilter,
            }
          );
          
          // Sort by country priority if a specific country is selected
          if (country !== 'all') {
            advancedFilteredMovies.sort((a: any, b: any) => {
              const scoreA = getCountryPriorityScore(a, country);
              const scoreB = getCountryPriorityScore(b, country);
              return scoreB - scoreA; // Higher score first
            });
          }
          
          advancedFilteredMovies.forEach((item: any) => {
            allResults.push({
              ...item,
              media_type: 'movie',
              title: item.title,
              origin_country: item.origin_country,
              original_language: item.original_language,
            });
          });
          totalCount += movieResults.total_results || 0;
        }
        
        // Add TV show results with advanced filtering
        if (tvResults.results) {
          // Apply basic content filter first
          let filteredTVShows = filterSearchResults(tvResults.results, contentFilter);
          
          // Apply country filtering if a specific country is selected
          if (country !== 'all') {
            filteredTVShows = filterByProductionCountry(filteredTVShows, country);
          }
          
          const relevantTVShows = filterAndSortResults(filteredTVShows, query);
          
          // Apply advanced content filtering (smart algorithm with rating + popularity)
          const advancedFilteredTVShows = await batchFilterMedia(
            relevantTVShows,
            {
              language: settings?.preferences?.language === 'all' ? undefined : settings?.preferences?.language,
              country: country === 'all' ? undefined : country,
              contentFilter: contentFilter,
            }
          );
          
          // Sort by country priority if a specific country is selected
          if (country !== 'all') {
            advancedFilteredTVShows.sort((a: any, b: any) => {
              const scoreA = getCountryPriorityScore(a, country);
              const scoreB = getCountryPriorityScore(b, country);
              return scoreB - scoreA; // Higher score first
            });
          }
          
          advancedFilteredTVShows.forEach((item: any) => {
            allResults.push({
              ...item,
              media_type: 'tv',
              title: item.name,
              origin_country: item.origin_country,
              original_language: item.original_language,
            });
          });
          totalCount += tvResults.total_results || 0;
        }
        
        // Add people results with improved word matching (no content filtering needed for people)
        if (peopleResults.results) {
          const relevantPeople = filterAndSortResults(
            peopleResults.results.map((person: any) => ({
              ...person,
              overview: person.known_for_department || '',
              title: person.name
            })), 
            query
          );
          relevantPeople.forEach((item: any) => {
            allResults.push({
              ...item,
              media_type: 'person',
              title: item.name,
            });
          });
          totalCount += peopleResults.total_results || 0;
        }

        // Add anime results with filtering
        if (animeResults.data) {
          const filteredAnime = animeResults.data.filter((anime: any) => {
            // Basic content filtering for anime
            if (contentFilter === 'kids') {
              // For kids mode, only include G-rated anime
              return anime.rating && anime.rating.toLowerCase().includes('g');
            }
            if (contentFilter === 'filtered') {
              // For filtered mode, exclude mature content
              return !anime.rating || !anime.rating.toLowerCase().includes('r');
            }
            return true; // All mode includes everything
          });

          // Map anime to search result format for filtering
          const mappedAnime = filteredAnime.map((anime: any) => ({
            ...anime,
            title: anime.title,
            name: anime.title,
            overview: anime.synopsis || anime.overview || '',
            popularity: anime.scored_by || 0
          }));

          const relevantAnime = filterAndSortResults(mappedAnime, query);
          relevantAnime.forEach((item: any) => {
            allResults.push({
              id: item.mal_id || item.id,
              title: item.title,
              name: item.title,
              overview: item.synopsis || item.overview || '',
              poster_path: item.images?.jpg?.large_image_url || item.poster_path,
              release_date: item.year ? `${item.year}-01-01` : '',
              first_air_date: item.year ? `${item.year}-01-01` : '',
              media_type: 'anime',
              vote_average: item.score || item.vote_average || 0,
              genre_ids: item.genres?.map((g: any) => g.mal_id) || [],
              origin_country: ['JP'], // Most anime originates from Japan
              original_language: 'ja',
            });
          });
          totalCount += animeResults.pagination?.items?.total || 0;
        }

        // Filter out blocked content before displaying
        let filteredResults = await filterBlockedContent(allResults, 'movie'); // Will check each item's media_type
        
        // Also filter out blocked persons
        try {
          const { getGloballyBlockedPersons } = await import('@/lib/firebase/contentFilter');
          const blockedPersons = await getGloballyBlockedPersons();
          
          filteredResults = filteredResults.filter(item => {
            if (item.media_type === 'person') {
              return !blockedPersons.has(item.id);
            }
            return true; // Keep non-person results
          });
        } catch (error) {
        }
        
        setResults(filteredResults);
        setTotalResults(totalCount);
        
      } catch (err) {
        setError(err instanceof Error ? err.message : "Search failed");
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [query, user?.uid, settings?.preferences?.contentFilter, settings?.preferences?.country]);

  // Track search in a separate effect to avoid dependency issues
  useEffect(() => {
    if (!query.trim()) return;
    
    // Debounce the tracking to avoid multiple calls
    const timeoutId = setTimeout(() => {
      if (user) {
        trackSearch(query);
      }
      addSearch(query);
    }, 500); // 500ms debounce
    
    return () => clearTimeout(timeoutId);
  }, [query, user, trackSearch, addSearch]);

  // Load blocked persons for admin
  useEffect(() => {
    const loadBlockedPersons = async () => {
      if (!userIsAdmin) return;
      
      try {
        const { getGloballyBlockedPersons } = await import('@/lib/firebase/contentFilter');
        const blocked = await getGloballyBlockedPersons();
        setBlockedPersons(blocked);
      } catch (error) {
      }
    };

    loadBlockedPersons();
  }, [userIsAdmin, results]);

  const handleBlockPerson = (person: SearchResult) => {
    setPersonToBlock(person);
    setShowBlockDialog(true);
  };

  const handleBlockConfirm = async () => {
    if (!user || !personToBlock || !userIsAdmin) return;
    
    setShowBlockDialog(false);
    setIsBlockLoading(true);
    
    try {
      await blockPersonForAdmin(
        personToBlock.id,
        personToBlock.name || personToBlock.title || 'Unknown Person',
        personToBlock.profile_path || null,
        user.uid,
        user.email || ''
      );
      
      // Update local state
      setBlockedPersons(prev => new Set([...prev, personToBlock.id]));
      
      // Remove the person from search results
      setResults(prev => prev.filter(result => 
        !(result.media_type === 'person' && result.id === personToBlock.id)
      ));
      
      toast({
        title: "🚫 Person Blocked",
        description: `${personToBlock.name || personToBlock.title} has been blocked. All content featuring this person will be hidden from all users.`,
        className: "bg-black/40 backdrop-blur-xl border-white/20 text-white shadow-2xl"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to block person",
        variant: "destructive"
      });
    } finally {
      setIsBlockLoading(false);
      setPersonToBlock(null);
    }
  };

  const handleUnblockPerson = async (person: SearchResult) => {
    if (!user || !userIsAdmin) return;
    
    setIsBlockLoading(true);
    
    try {
      await unblockPersonForAdmin(
        person.id,
        user.uid,
        user.email || ''
      );
      
      // Update local state
      setBlockedPersons(prev => {
        const newSet = new Set(prev);
        newSet.delete(person.id);
        return newSet;
      });
      
      toast({
        title: "✅ Person Unblocked",
        description: `${person.name || person.title} has been unblocked and their content is now visible to all users.`,
        className: "bg-black/40 backdrop-blur-xl border-white/20 text-white shadow-2xl"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to unblock person",
        variant: "destructive"
      });
    } finally {
      setIsBlockLoading(false);
    }
  };

  const handleResultClick = async (result: SearchResult) => {
    // Double-check person blocking before navigation
    if (result.media_type === 'person') {
      try {
        const { getGloballyBlockedPersons } = await import('@/lib/firebase/contentFilter');
        const blockedPersons = await getGloballyBlockedPersons();
        
        if (blockedPersons.has(result.id)) {
          setError('This person is not available');
          return;
        }
      } catch (error) {
      }
      
      router.push(`/person/${result.id}`);
    } else if (result.media_type === 'movie') {
      router.push(`/movies/${result.id}`);
    } else if (result.media_type === 'anime') {
      // For anime, navigate to our anime detail page
      router.push(`/anime/${result.id}`);
    } else {
      router.push(`/tv-shows/${result.id}`);
    }
  };

  const movieResults = results.filter(r => r.media_type === 'movie');
  const tvResults = results.filter(r => r.media_type === 'tv');
  const personResults = results.filter(r => r.media_type === 'person');
  const animeResults = results.filter(r => r.media_type === 'anime');

  // Add featured content state
  const [featuredContent, setFeaturedContent] = useState<SearchResult[]>([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const { history, getSuggestions } = useSearchHistory();

  // Fetch featured content when no search query
  useEffect(() => {
    const fetchFeaturedContent = async () => {
      if (query.trim()) return;
      
      setLoadingFeatured(true);
      try {
        const country = settings?.preferences?.country || 'all';
        const contentFilter = settings?.preferences?.contentFilter || 'filtered';
        const filterConfig = getFilterConfig(contentFilter);

        // Fetch popular content from different categories
        const [popularMovies, popularTV, trendingMovies] = await Promise.all([
          searchMovies('popular', filterConfig.includeAdult, country, 1),
          searchTVShows('trending', filterConfig.includeAdult, country, 1), 
          searchMovies('trending', filterConfig.includeAdult, country, 1),
        ]);

        const featured: SearchResult[] = [];

        // Add trending movies
        if (trendingMovies.results) {
          trendingMovies.results.slice(0, 4).forEach((movie: any) => {
            featured.push({
              ...movie,
              media_type: 'movie',
              title: movie.title,
            });
          });
        }

        // Add popular TV shows
        if (popularTV.results) {
          popularTV.results.slice(0, 3).forEach((tv: any) => {
            featured.push({
              ...tv,
              media_type: 'tv',
              title: tv.name,
            });
          });
        }

        // Add popular movies
        if (popularMovies.results) {
          popularMovies.results.slice(0, 3).forEach((movie: any) => {
            featured.push({
              ...movie,
              media_type: 'movie',
              title: movie.title,
            });
          });
        }

        // Filter blocked content
        const filteredFeatured = await filterBlockedContent(featured, 'movie');
        setFeaturedContent(filteredFeatured);

      } catch (error) {
      } finally {
        setLoadingFeatured(false);
      }
    };

    fetchFeaturedContent();
  }, [query, settings?.preferences?.country, settings?.preferences?.contentFilter]);

  if (!query.trim()) {
    const recentSearches = getSuggestions('', settings?.preferences?.contentFilter).slice(0, 6);
    
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black">
        {/* Hero Section */}
        <div className="relative pt-20 pb-16 overflow-hidden">
          {/* Background with featured content thumbnails */}
          <div className="absolute inset-0 opacity-10">
            <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2 h-full">
              {featuredContent.slice(0, 48).map((item, index) => (
                <div key={index} className="aspect-[2/3] relative">
                  {item.poster_path && (
                    <Image
                      src={`https://image.tmdb.org/t/p/w300${item.poster_path}`}
                      alt=""
                      fill
                      className="object-cover rounded opacity-60"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="relative container max-w-4xl mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              {/* Search Icon with Glow Effect */}
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-purple-500/20 blur-3xl rounded-full transform scale-150"></div>
                <Search className="w-20 h-20 text-purple-400 mx-auto relative z-10" />
              </div>

              <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white via-purple-200 to-blue-200 bg-clip-text text-transparent leading-tight">
                Discover Amazing Content
              </h1>
              
              <p className="text-xl md:text-2xl text-gray-300 mb-12 leading-relaxed">
                Search through millions of movies, TV shows, anime & people
              </p>

              {/* Enhanced Search Input with Glass Effect */}
              <div className="relative mb-12">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 blur-xl rounded-3xl transform scale-110"></div>
                <div className="relative bg-black/40 backdrop-blur-xl border border-white/20 rounded-2xl p-2">
                  <SearchInput 
                    placeholder="Search movies, TV shows, anime & people..."
                    className="border-0 bg-transparent"
                  />
                </div>
              </div>

              {/* Categories Pills */}
              <div className="flex flex-wrap justify-center gap-4 mb-12">
                {[
                  { icon: Film, label: "Movies", color: "from-red-500 to-pink-500" },
                  { icon: Tv, label: "TV Shows", color: "from-blue-500 to-cyan-500" },
                  { icon: Monitor, label: "Anime", color: "from-purple-500 to-indigo-500" },
                  { icon: User, label: "People", color: "from-green-500 to-emerald-500" }
                ].map((category) => (
                  <motion.div
                    key={category.label}
                    whileHover={{ scale: 1.05 }}
                    className="group cursor-pointer"
                  >
                    <div className={`bg-gradient-to-r ${category.color} p-0.5 rounded-full`}>
                      <div className="bg-black/60 backdrop-blur-sm rounded-full px-6 py-3 flex items-center gap-2 transition-all duration-300 group-hover:bg-black/40">
                        <category.icon className="w-4 h-4" />
                        <span className="text-sm font-medium">{category.label}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Recent Searches Section */}
        {recentSearches.length > 0 && (
          <div className="container max-w-6xl mx-auto px-4 pb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Clock className="w-5 h-5 text-purple-400" />
                  Recent Searches
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => history.length > 0 && window.location.reload()}
                  className="text-gray-400 hover:text-white"
                >
                  Clear All
                </Button>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {recentSearches.map((search) => (
                  <motion.button
                    key={search.id}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => router.push(`/search?q=${encodeURIComponent(search.query)}`)}
                    className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-400/30 rounded-xl p-3 text-left transition-all duration-300 group"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Search className="w-3 h-3 text-gray-400 group-hover:text-purple-400" />
                      <span className="text-sm text-gray-400 group-hover:text-purple-400">Search</span>
                    </div>
                    <p className="text-white font-medium truncate">{search.query}</p>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {/* Featured Content Grid */}
        {!loadingFeatured && featuredContent.length > 0 && (
          <div className="container max-w-7xl mx-auto px-4 pb-16">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">
                <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                  Trending & Popular
                </span>
              </h2>

              {/* Grid Layout Similar to User Profile */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {featuredContent.slice(0, 20).map((item, index) => (
                  <motion.div
                    key={`${item.media_type}-${item.id}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.05 }}
                    className="group cursor-pointer relative"
                    onClick={() => {
                      const type = item.media_type === 'tv' ? 'tv-shows' : item.media_type === 'movie' ? 'movies' : 'anime';
                      router.push(`/${type}/${item.id}`);
                    }}
                  >
                    {/* Card with Glass Effect */}
                    <div className="relative aspect-[2/3] rounded-2xl overflow-hidden bg-black/40 backdrop-blur-sm border border-white/10 group-hover:border-purple-400/30 transition-all duration-300">
                      {/* Poster */}
                      {item.poster_path ? (
                        <Image
                          src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
                          alt={item.title || 'Content'}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-110"
                        />
                      ) : (
                        <MoviePlaceholder 
                          title={item.title || 'Unknown'}
                          mediaType={item.media_type}
                          size="large"
                          className="w-full h-full"
                        />
                      )}

                      {/* Overlay with gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                      {/* Media Type Badge */}
                      <div className="absolute top-3 left-3">
                        <div className="bg-black/60 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
                          {item.media_type === 'movie' ? (
                            <Film className="w-3 h-3 text-red-400" />
                          ) : item.media_type === 'tv' ? (
                            <Tv className="w-3 h-3 text-blue-400" />
                          ) : (
                            <Monitor className="w-3 h-3 text-purple-400" />
                          )}
                          <span className="text-xs text-white capitalize">{item.media_type}</span>
                        </div>
                      </div>

                      {/* Rating Badge */}
                      {item.vote_average && item.vote_average > 0 && (
                        <div className="absolute top-3 right-3">
                          <div className="bg-black/60 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                            <span className="text-xs text-white font-medium">
                              {item.vote_average.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Play Button (on hover) */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                        <div className="bg-white/20 backdrop-blur-sm rounded-full p-4 transform scale-90 group-hover:scale-100 transition-transform duration-300">
                          <Play className="w-6 h-6 text-white fill-white" />
                        </div>
                      </div>
                    </div>

                    {/* Title and Info */}
                    <div className="mt-3 px-1">
                      <h3 className="font-semibold text-white line-clamp-2 text-sm leading-tight mb-1 group-hover:text-purple-300 transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-xs text-gray-400">
                        {item.release_date || item.first_air_date 
                          ? new Date(item.release_date || item.first_air_date || '').getFullYear()
                          : 'Unknown'
                        }
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* View More Button */}
              <div className="text-center mt-12">
                <Button
                  onClick={() => router.push('/movies')}
                  size="lg"
                  className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white border-0 px-8 py-3 rounded-full font-semibold shadow-lg hover:shadow-purple-500/25 transition-all duration-300"
                >
                  <TrendingUp className="w-5 h-5 mr-2" />
                  Explore More Content
                </Button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Loading Featured Content */}
        {loadingFeatured && (
          <div className="container max-w-7xl mx-auto px-4 pb-16">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {Array.from({ length: 10 }).map((_, index) => (
                <div key={index} className="aspect-[2/3] bg-gray-800/50 rounded-2xl animate-pulse" />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black pt-20 pb-16">
      <div className="container max-w-7xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header with Glass Effect */}
          <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-8">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="flex items-center gap-2 text-gray-300 hover:text-white self-start"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              
              <div className="flex-1">
                {/* Enhanced Search Input */}
                <div className="relative mb-4">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-blue-500/10 blur-xl rounded-2xl"></div>
                  <div className="relative bg-black/40 backdrop-blur-xl border border-white/20 rounded-xl p-1">
                    <SearchInput 
                      initialValue={query}
                      placeholder="Search movies, TV shows, anime & people..."
                      className="border-0 bg-transparent"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold mb-1 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                      Search Results
                    </h1>
                    <p className="text-gray-400">
                      {totalResults > 0 ? `${totalResults.toLocaleString()} results` : 'Results'} for "{query}"
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-3 flex-wrap">
                    <CountryIndicator country={settings?.preferences?.country || 'all'} />
                    {settings?.preferences?.contentFilter && settings.preferences.contentFilter !== 'filtered' && (
                      <div className={`px-3 py-1 rounded-full text-xs font-medium border ${
                        settings.preferences.contentFilter === 'all' 
                          ? 'bg-red-500/20 border-red-500/30 text-red-400' 
                          : 'bg-green-500/20 border-green-500/30 text-green-400'
                      }`}>
                        {settings.preferences.contentFilter === 'all' ? 'All Content' : 'Kids Mode'}
                      </div>
                    )}
                    {user && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push('/user/settings')}
                        className="flex items-center gap-2 text-gray-300 hover:text-white border border-white/10 hover:border-purple-400/30 rounded-xl"
                      >
                        <Settings className="w-4 h-4" />
                        <span className="hidden sm:inline">Settings</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="relative mb-4">
                  <div className="absolute inset-0 bg-purple-500/20 blur-xl rounded-full"></div>
                  <div className="relative animate-spin rounded-full h-12 w-12 border-2 border-transparent border-t-purple-500 border-r-purple-500 mx-auto"></div>
                </div>
                <p className="text-gray-400">Searching amazing content...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 backdrop-blur-xl border border-red-500/20 rounded-2xl p-8 text-center max-w-2xl mx-auto"
            >
              <div className="text-red-400 mb-4">
                <Shield className="w-12 h-12 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">Content Blocked</h3>
                <p className="text-sm text-gray-300">{error}</p>
              </div>
              <div className="mt-6 text-sm text-gray-400">
                You can change your content filter settings in 
                <Button 
                  variant="link" 
                  className="text-blue-400 hover:text-blue-300 p-0 h-auto font-normal text-sm ml-1"
                  onClick={() => router.push('/user/settings')}
                >
                  Settings
                </Button>
              </div>
            </motion.div>
          )}

          {/* No Results State */}
          {!loading && !error && results.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-20"
            >
              <div className="bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl p-12 max-w-2xl mx-auto">
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-gray-500/20 blur-2xl rounded-full"></div>
                  <Search className="w-20 h-20 text-gray-400 mx-auto relative z-10" />
                </div>
                <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  No Results Found
                </h2>
                <p className="text-gray-400 mb-8 text-lg">
                  We couldn't find anything matching "{query}"
                </p>
                
                <div className="bg-white/5 rounded-xl p-6 mb-8 text-left">
                  <h4 className="font-semibold text-white mb-3">Try these suggestions:</h4>
                  <ul className="text-sm text-gray-300 space-y-2">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                      Check your spelling
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                      Use different or more general keywords
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                      Search for actors, directors, or characters
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                      Try browsing by category instead
                    </li>
                  </ul>
                </div>

                <Button 
                  onClick={() => router.push('/')}
                  size="lg"
                  className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white border-0 px-8 py-3 rounded-full font-semibold"
                >
                  <TrendingUp className="w-5 h-5 mr-2" />
                  Browse Popular Content
                </Button>
              </div>
            </motion.div>
          )}

          {/* Search Results */}
          {!loading && !error && results.length > 0 && (
            <div className="space-y-12">
              {/* Results Summary */}
              <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">
                    Found {totalResults.toLocaleString()} results across all categories
                  </h2>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    {movieResults.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Film className="w-4 h-4 text-red-400" />
                        {movieResults.length} movies
                      </span>
                    )}
                    {tvResults.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Tv className="w-4 h-4 text-blue-400" />
                        {tvResults.length} TV shows
                      </span>
                    )}
                    {animeResults.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Monitor className="w-4 h-4 text-purple-400" />
                        {animeResults.length} anime
                      </span>
                    )}
                    {personResults.length > 0 && (
                      <span className="flex items-center gap-1">
                        <User className="w-4 h-4 text-green-400" />
                        {personResults.length} people
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Movies Section */}
              {movieResults.length > 0 && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
                >
                  <div className="flex items-center gap-3 mb-8">
                    <div className="bg-gradient-to-r from-red-500 to-pink-500 p-2 rounded-xl">
                      <Film className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">Movies</h2>
                      <p className="text-gray-400">{movieResults.length} results found</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                    {movieResults.map((movie) => (
                      <SearchCard
                        key={`movie-${movie.id}`}
                        id={movie.id}
                        title={movie.title || ''}
                        posterPath={movie.poster_path}
                        overview={movie.overview}
                        releaseDate={movie.release_date}
                        voteAverage={movie.vote_average}
                        mediaType="movie"
                        originCountry={movie.origin_country}
                      />
                    ))}
                  </div>
                </motion.section>
              )}

              {/* TV Shows Section */}
              {tvResults.length > 0 && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
                >
                  <div className="flex items-center gap-3 mb-8">
                    <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-2 rounded-xl">
                      <Tv className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">TV Shows</h2>
                      <p className="text-gray-400">{tvResults.length} results found</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                    {tvResults.map((tv) => (
                      <SearchCard
                        key={`tv-${tv.id}`}
                        id={tv.id}
                        title={tv.name || ''}
                        posterPath={tv.poster_path}
                        overview={tv.overview}
                        firstAirDate={tv.first_air_date}
                        voteAverage={tv.vote_average}
                        mediaType="tv"
                        originCountry={tv.origin_country}
                      />
                    ))}
                  </div>
                </motion.section>
              )}

              {/* Anime Section */}
              {animeResults.length > 0 && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
                >
                  <div className="flex items-center gap-3 mb-8">
                    <div className="bg-gradient-to-r from-purple-500 to-indigo-500 p-2 rounded-xl">
                      <Monitor className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">Anime</h2>
                      <p className="text-gray-400">{animeResults.length} results found</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                    {animeResults.map((anime) => (
                      <SearchCard
                        key={`anime-${anime.id}`}
                        id={anime.id}
                        title={anime.title || ''}
                        posterPath={anime.poster_path}
                        overview={anime.overview}
                        firstAirDate={anime.first_air_date}
                        voteAverage={anime.vote_average}
                        mediaType="anime"
                        originCountry={anime.origin_country}
                      />
                    ))}
                  </div>
                </motion.section>
              )}

              {/* People Section */}
              {personResults.length > 0 && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-6"
                >
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-2 rounded-xl">
                        <User className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-white">People</h2>
                        <p className="text-gray-400">{personResults.length} results found</p>
                      </div>
                    </div>
                    {userIsAdmin && (
                      <div className="bg-orange-500/20 border border-orange-500/30 rounded-full px-3 py-1">
                        <span className="text-xs text-orange-400 font-medium">Admin View</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                    {personResults.slice(0, 16).map((person) => {
                      const isBlocked = blockedPersons.has(person.id);
                      
                      return (
                        <motion.div
                          key={`person-${person.id}`}
                          whileHover={{ scale: 1.03 }}
                          className="bg-black/30 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden group relative hover:border-green-400/30 transition-all duration-300"
                        >
                          {/* Admin Block Controls */}
                          {userIsAdmin && (
                            <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                              {isBlocked ? (
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUnblockPerson(person);
                                  }}
                                  disabled={isBlockLoading}
                                  className="bg-green-600/90 hover:bg-green-600 text-white p-1 h-6 w-6 rounded-md backdrop-blur-sm"
                                  title="Unblock Person"
                                >
                                  <Shield className="w-3 h-3" />
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleBlockPerson(person);
                                  }}
                                  disabled={isBlockLoading}
                                  className="bg-red-600/90 hover:bg-red-600 text-white p-1 h-6 w-6 rounded-md backdrop-blur-sm"
                                  title="Block Person"
                                >
                                  <Ban className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          )}
                          
                          {/* Blocked Status Indicator */}
                          {userIsAdmin && isBlocked && (
                            <div className="absolute top-2 left-2 z-20">
                              <span className="bg-red-600/90 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full font-medium">
                                BLOCKED
                              </span>
                            </div>
                          )}

                          <div 
                            className="relative aspect-[2/3] cursor-pointer overflow-hidden"
                            onClick={() => handleResultClick(person)}
                          >
                            {person.profile_path ? (
                              <Image
                                src={`https://image.tmdb.org/t/p/w300${person.profile_path}`}
                                alt={person.name || 'Person'}
                                fill
                                className="object-cover transition-transform duration-300 group-hover:scale-110"
                              />
                            ) : (
                              <MoviePlaceholder 
                                title={person.name || 'Unknown Person'}
                                mediaType="person"
                                size="large"
                                className="w-full h-full"
                              />
                            )}
                            
                            {/* Hover Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            
                            {/* View Details Button */}
                            <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <Button
                                size="sm"
                                className="w-full bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border-0 text-xs font-medium"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleResultClick(person);
                                }}
                              >
                                View Details
                              </Button>
                            </div>
                          </div>
                          
                          <div className="p-3">
                            <h3 className="font-semibold text-white text-sm line-clamp-2 group-hover:text-green-300 transition-colors">
                              {person.name}
                            </h3>
                            <p className="text-xs text-gray-400 mt-1">Actor</p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.section>
              )}
            </div>
          )}
        </motion.div>
        
        {/* Block Confirmation Dialog */}
        {userIsAdmin && (
          <BlockConfirmDialog
            isOpen={showBlockDialog}
            onClose={() => {
              setShowBlockDialog(false);
              setPersonToBlock(null);
            }}
            onConfirm={handleBlockConfirm}
            title={personToBlock?.name || personToBlock?.title || 'Unknown Person'}
            isAdmin={true}
            isPersonBlock={true}
          />
        )}
      </div>
    </div>
  );
}
