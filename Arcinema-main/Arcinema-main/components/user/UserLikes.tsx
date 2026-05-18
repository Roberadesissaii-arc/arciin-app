// app/user/likes/page.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { 
  Loader2, 
  Heart,
  Film, 
  Tv2,
  Grid,
  LayoutList,
  Sparkles,
  TrendingUp,
  Star,
  Filter,
  ArrowUpDown,
  Trophy,
  Clock,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import MyLikeCard from "@/components/user/MyCard/MyLikeCard";
import { SavedMedia } from "@/types/user";
import { cn } from "@/lib/utils";
import { doc, getDoc } from 'firebase/firestore';
import { projectFirestore as db } from '@/firebase/config';
import { toast } from "@/components/ui/use-toast";

const filterTypes = [
  { id: 'all', label: 'All Favorites', icon: Heart },
  { id: 'movie', label: 'Movies', icon: Film },
  { id: 'tv', label: 'TV Shows', icon: Tv2 },
  { id: 'recommended', label: 'For You', icon: Sparkles },
  { id: 'topRated', label: 'Top Rated', icon: Trophy },
  { id: 'recent', label: 'Recently Liked', icon: Clock },
] as const;

function EmptyState() {
  const router = useRouter();
  
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-6 max-w-md mx-auto px-4">
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-32 h-32 rounded-full bg-white/5 flex items-center justify-center">
              <Heart className="w-16 h-16 text-gray-600" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-12 h-12 rounded-full bg-pink-500/20 flex items-center justify-center">
              <Heart className="w-6 h-6 text-pink-400 fill-pink-400" />
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Your favorites are empty</h2>
          <p className="text-gray-400">
            Start building your favorites collection by liking movies and TV shows you love
          </p>
        </div>
        
        <Button 
          onClick={() => router.push('/movies')}
          className="bg-indigo-500 hover:bg-indigo-600"
        >
          <Film className="w-4 h-4 mr-2" />
          Browse Movies
        </Button>
      </div>
    </div>
  );
}

export default function UserLikes() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<SavedMedia[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'movie' | 'tv' | 'recommended' | 'topRated' | 'recent'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [recommendedContent, setRecommendedContent] = useState<SavedMedia[]>([]);
  const [mediaTypeFilter, setMediaTypeFilter] = useState<'all' | 'movie' | 'tv'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'title' | 'rating'>('recent');

  useEffect(() => {
    const fetchFavorites = async () => {
      if (!user) {
        router.push('/auth/login');
        return;
      }

      try {
        setLoading(true);
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const userFavorites = userData.favorites || [];
          setFavorites(userFavorites);
          
          // Fetch recommended content based on favorites
          if (userFavorites.length > 0) {
            await fetchRecommendations(userFavorites);
          }
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load your favorites",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [user, router]);

  const fetchRecommendations = async (userFavorites: SavedMedia[]) => {
    try {
      // Get genres from user's favorites
      const favoriteGenres = new Set<number>();
      userFavorites.forEach(item => {
        if (item.genres && Array.isArray(item.genres)) {
          item.genres.forEach((genre: any) => {
            if (typeof genre === 'number') {
              favoriteGenres.add(genre);
            } else if (genre.id) {
              favoriteGenres.add(genre.id);
            }
          });
        }
      });

      // Fetch trending content
      const trendingResponse = await fetch(
        `https://api.themoviedb.org/3/trending/all/week?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}`
      );
      const trendingData = await trendingResponse.json();

      // Filter and score content based on user preferences
      const recommended = trendingData.results
        .filter((item: any) => {
          // Don't recommend items already in favorites
          return !userFavorites.some(fav => fav.id === item.id);
        })
        .map((item: any) => {
          // Calculate relevance score
          let score = 0;
          if (item.genre_ids) {
            item.genre_ids.forEach((genreId: number) => {
              if (favoriteGenres.has(genreId)) score += 1;
            });
          }
          return { ...item, relevanceScore: score };
        })
        .sort((a: any, b: any) => b.relevanceScore - a.relevanceScore)
        .slice(0, 12)
        .map((item: any) => ({
          id: item.id,
          title: item.title || item.name,
          name: item.name || item.title,
          poster_path: item.poster_path,
          backdrop_path: item.backdrop_path,
          overview: item.overview,
          vote_average: item.vote_average,
          release_date: item.release_date || item.first_air_date,
          first_air_date: item.first_air_date || item.release_date,
          media_type: item.media_type || (item.title ? 'movie' : 'tv'),
          genre_ids: item.genre_ids,
        }));

      setRecommendedContent(recommended);
    } catch (error) {
    }
  };

  const getFilteredFavorites = (filterType: 'all' | 'movie' | 'tv' | 'recommended' | 'topRated' | 'recent') => {
    if (filterType === 'recommended') return recommendedContent;
    
    // Top Rated - favorites with rating >= 8.0
    if (filterType === 'topRated') {
      return favorites.filter(item => (item.vote_average || 0) >= 8.0);
    }
    
    // Recent - last 20 items (assuming most recent are first)
    if (filterType === 'recent') {
      return favorites.slice(0, 20);
    }
    
    let filtered = filterType === 'all' ? favorites : favorites.filter(item => item.media_type === filterType);
    
    // Apply media type filter
    if (mediaTypeFilter !== 'all') {
      filtered = filtered.filter(item => item.media_type === mediaTypeFilter);
    }
    
    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return (a.title || a.name || '').localeCompare(b.title || b.name || '');
        case 'rating':
          return (b.vote_average || 0) - (a.vote_average || 0);
        case 'recent':
        default:
          return 0; // Keep original order (most recent first)
      }
    });
    
    return sorted;
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!favorites || favorites.length === 0) {
    return (
      <div className="min-h-screen">
        <div className="max-w-4xl mx-auto px-4 py-20">
          <EmptyState />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-8 sm:pt-24">
      <div className="bg-black/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-12">
            <div>
              <h1 className="text-3xl font-bold mb-4 text-white">
                My Favorites
              </h1>
              <p className="text-base text-gray-400 max-w-2xl">
                Welcome to your personalized entertainment hub! Every movie and show here reflects your unique taste.
              </p>
            </div>

            <Button 
              onClick={() => router.push('/movies')}
              className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:via-indigo-400 hover:to-indigo-500 text-white font-medium
                       before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent
                       [@media(max-width:640px)]:w-full"
            >
              <span className="relative z-10 flex items-center gap-2">
                <Film className="w-4 h-4" />
                Browse More
              </span>
            </Button>
          </div>

          {/* Tabs Section */}
          <div className="pb-8">
            <Tabs
              defaultValue="all"
              onValueChange={(value) => setActiveFilter(value as 'all' | 'movie' | 'tv' | 'recommended' | 'topRated' | 'recent')}
            >
              <div className="flex items-center justify-between gap-4
                            [@media(max-width:640px)]:flex-col">
                {/* Navigation - 2x2 Grid WITH CONTAINER */}
                <div className="flex flex-col gap-2 flex-1 w-full bg-black/20 backdrop-blur-sm rounded-xl border border-white/10 p-3">
                  {/* First Row */}
                  <TabsList className="grid grid-cols-3 gap-2 bg-transparent h-auto p-0">
                    <TabsTrigger
                      value="all"
                      className="h-12 gap-2 data-[state=active]:bg-indigo-500 data-[state=active]:text-white font-medium bg-transparent hover:bg-white/5"
                    >
                      <Heart className="w-4 h-4" />
                      <span className="sm:hidden">All.</span>
                      <span className="hidden sm:inline">All Favorites</span>
                      <span className="text-xs ml-1">{favorites.length > 5 ? '5+' : favorites.length}</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="movie"
                      className="h-12 gap-2 data-[state=active]:bg-indigo-500 data-[state=active]:text-white font-medium bg-transparent hover:bg-white/5"
                    >
                      <Film className="w-4 h-4" />
                      <span className="sm:hidden">Mov.</span>
                      <span className="hidden sm:inline">Movies</span>
                      <span className="text-xs ml-1">{favorites.filter(item => item.media_type === 'movie').length > 5 ? '5+' : favorites.filter(item => item.media_type === 'movie').length}</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="tv"
                      className="h-12 gap-2 data-[state=active]:bg-indigo-500 data-[state=active]:text-white font-medium bg-transparent hover:bg-white/5"
                    >
                      <Tv2 className="w-4 h-4" />
                      <span className="sm:hidden">TV.</span>
                      <span className="hidden sm:inline">TV Shows</span>
                      <span className="text-xs ml-1">{favorites.filter(item => item.media_type === 'tv').length > 5 ? '5+' : favorites.filter(item => item.media_type === 'tv').length}</span>
                    </TabsTrigger>
                  </TabsList>

                  {/* Second Row */}
                  <TabsList className="grid grid-cols-3 gap-2 bg-transparent h-auto p-0">
                    <TabsTrigger
                      value="recommended"
                      className="h-12 gap-2 data-[state=active]:bg-indigo-500 data-[state=active]:text-white font-medium bg-transparent hover:bg-white/5"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span className="sm:hidden">For.</span>
                      <span className="hidden sm:inline">For You</span>
                      <span className="text-xs ml-1">{recommendedContent.length > 5 ? '5+' : recommendedContent.length}</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="topRated"
                      className="h-12 gap-2 data-[state=active]:bg-indigo-500 data-[state=active]:text-white font-medium bg-transparent hover:bg-white/5"
                    >
                      <Trophy className="w-4 h-4" />
                      <span className="sm:hidden">Top.</span>
                      <span className="hidden sm:inline">Top Rated</span>
                      <span className="text-xs ml-1">{favorites.filter(item => (item.vote_average || 0) >= 8.0).length > 5 ? '5+' : favorites.filter(item => (item.vote_average || 0) >= 8.0).length}</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="recent"
                      className="h-12 gap-2 data-[state=active]:bg-indigo-500 data-[state=active]:text-white font-medium bg-transparent hover:bg-white/5"
                    >
                      <Clock className="w-4 h-4" />
                      <span className="sm:hidden">Rec.</span>
                      <span className="hidden sm:inline">Recent</span>
                      <span className="text-xs ml-1">{Math.min(20, favorites.length) > 5 ? '5+' : Math.min(20, favorites.length)}</span>
                    </TabsTrigger>
                  </TabsList>
                </div>

                {/* View Controls - 2x2 Grid on Desktop, Single Row on Mobile */}
                <div className="grid grid-cols-2 gap-2 bg-black/20 backdrop-blur-sm rounded-xl border border-white/10 p-3
                              [@media(max-width:640px)]:grid-cols-4 [@media(max-width:640px)]:w-full [@media(max-width:640px)]:gap-1.5 [@media(max-width:640px)]:p-2">
                  {/* Media Type Filter */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon" className="h-12 w-12 border-white/10 hover:bg-white/5 [@media(max-width:640px)]:h-10 [@media(max-width:640px)]:w-10" title="Filter by Type">
                        <Filter className="w-4 h-4 [@media(max-width:640px)]:w-3.5 [@media(max-width:640px)]:h-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-black/95 backdrop-blur-xl border-white/10">
                      <DropdownMenuItem onClick={() => setMediaTypeFilter('all')}>
                        All Types
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setMediaTypeFilter('movie')}>
                        Movies Only
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setMediaTypeFilter('tv')}>
                        TV Shows Only
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Sort Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon" className="h-12 w-12 border-white/10 hover:bg-white/5 [@media(max-width:640px)]:h-10 [@media(max-width:640px)]:w-10" title="Sort">
                        <ArrowUpDown className="w-4 h-4 [@media(max-width:640px)]:w-3.5 [@media(max-width:640px)]:h-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-black/95 backdrop-blur-xl border-white/10">
                      <DropdownMenuItem onClick={() => setSortBy('recent')}>
                        Recently Added
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSortBy('title')}>
                        Title (A-Z)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSortBy('rating')}>
                        Highest Rated
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* View Mode Toggle - Grid */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setViewMode('grid')}
                    className={cn(
                      "h-12 w-12 hover:bg-white/5 [@media(max-width:640px)]:h-10 [@media(max-width:640px)]:w-10",
                      viewMode === 'grid' && 'bg-white/10'
                    )}
                    title="Grid View"
                  >
                    <Grid className="w-4 h-4 [@media(max-width:640px)]:w-3.5 [@media(max-width:640px)]:h-3.5" />
                  </Button>

                  {/* View Mode Toggle - List */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setViewMode('list')}
                    className={cn(
                      "h-12 w-12 hover:bg-white/5 [@media(max-width:640px)]:h-10 [@media(max-width:640px)]:w-10",
                      viewMode === 'list' && 'bg-white/10'
                    )}
                    title="List View"
                  >
                    <LayoutList className="w-4 h-4 [@media(max-width:640px)]:w-3.5 [@media(max-width:640px)]:h-3.5" />
                  </Button>
                </div>
              </div>              {/* Content */}
              <div className="mt-8">
                {filterTypes.map(({ id, icon: Icon, label }) => (
                  <TabsContent key={id} value={id}>
                    {id === 'recommended' ? (
                      // Special handling for recommended tab
                      recommendedContent.length === 0 ? (
                        <div className="flex items-center justify-center min-h-[50vh]">
                          <div className="text-center space-y-4 max-w-md mx-auto px-4">
                            <div className="flex justify-center">
                              <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center">
                                <Sparkles className="w-12 h-12 text-gray-600" />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <h3 className="text-xl font-semibold">Discovering Perfect Matches</h3>
                              <p className="text-gray-400 text-sm">
                                Like more content to get personalized recommendations based on your taste!
                              </p>
                            </div>
                            <Button 
                              onClick={() => router.push('/movies')}
                              variant="outline"
                              className="border-white/20 hover:bg-white/5"
                            >
                              <Star className="w-4 h-4 mr-2" />
                              Explore Content
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="mb-6 p-4 rounded-xl bg-black/40 backdrop-blur-sm border border-white/10">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-white/10">
                                <Sparkles className="w-5 h-5 text-white" />
                              </div>
                              <p className="text-sm text-gray-300">
                                <span className="font-semibold text-white">Smart Recommendations:</span> Based on your liked content, 
                                we've curated {recommendedContent.length} titles that match your preferences
                              </p>
                            </div>
                          </div>
                          <AnimatePresence mode="wait">
                            <motion.div
                              key={`recommended-${viewMode}`}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className={cn(
                                viewMode === 'grid'
                                  ? "grid grid-cols-4 gap-6 [@media(max-width:1280px)]:grid-cols-3 [@media(max-width:1024px)]:grid-cols-3 [@media(max-width:768px)]:grid-cols-2 [@media(max-width:640px)]:grid-cols-2 [@media(max-width:640px)]:gap-4"
                                  : "space-y-4 [@media(max-width:640px)]:space-y-3"
                              )}
                            >
                              {recommendedContent.map((item) => (
                                <MyLikeCard
                                  key={item.id}
                                  movie={item}
                                  viewMode={viewMode}
                                />
                              ))}
                            </motion.div>
                          </AnimatePresence>
                        </>
                      )
                    ) : (
                      // Original handling for other tabs
                      getFilteredFavorites(id).length === 0 ? (
                        <div className="flex items-center justify-center min-h-[50vh]">
                          <div className="text-center space-y-4 max-w-md mx-auto px-4">
                            <div className="flex justify-center">
                              <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center">
                                <Icon className="w-12 h-12 text-gray-600" />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <h3 className="text-xl font-semibold">No {label.toLowerCase()} yet</h3>
                              <p className="text-gray-400 text-sm">
                                {id === 'all' && 'Like movies and TV shows to add them to your favorites'}
                                {id === 'movie' && 'Like movies to see them here'}
                                {id === 'tv' && 'Like TV shows to see them here'}
                                {id === 'topRated' && 'Like more highly-rated content (8.0+) to see them here'}
                                {id === 'recent' && 'Start liking content to see your recently added favorites'}
                              </p>
                            </div>
                            <Button 
                              onClick={() => router.push(id === 'tv' ? '/tv-shows' : '/movies')}
                              variant="outline"
                              className="border-white/20 hover:bg-white/5"
                            >
                              <Icon className="w-4 h-4 mr-2" />
                              Browse {id === 'tv' ? 'TV Shows' : id === 'movie' ? 'Movies' : 'Content'}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={`${id}-${viewMode}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className={cn(
                              viewMode === 'grid'
                                ? "grid grid-cols-4 gap-6 [@media(max-width:1280px)]:grid-cols-3 [@media(max-width:1024px)]:grid-cols-3 [@media(max-width:768px)]:grid-cols-2 [@media(max-width:640px)]:grid-cols-2 [@media(max-width:640px)]:gap-4"
                                : "space-y-4 [@media(max-width:640px)]:space-y-3"
                            )}
                          >
                            {getFilteredFavorites(id).map((item) => (
                              <MyLikeCard
                                key={item.id}
                                movie={item}
                                viewMode={viewMode}
                              />
                            ))}
                          </motion.div>
                        </AnimatePresence>
                      )
                    )}
                  </TabsContent>
                ))}
              </div>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
