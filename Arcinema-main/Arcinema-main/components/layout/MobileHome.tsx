"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Play, TrendingUp, Star, Calendar, ChevronLeft, ChevronRight, Search, Film, X } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { doc, onSnapshot } from 'firebase/firestore';
import { projectFirestore as db } from '@/firebase/config';
import { updateProfile } from 'firebase/auth';
import { projectAuth } from "@/firebase/config";

interface Movie {
  id: number;
  title?: string;
  name?: string;
  poster_path: string;
  backdrop_path: string;
  vote_average: number;
  overview: string;
  release_date?: string;
  first_air_date?: string;
  media_type?: string;
}

export default function MobileHome() {
  const router = useRouter();
  const { user } = useAuth();
  const [featuredMovie, setFeaturedMovie] = useState<Movie | null>(null);
  const [trendingContent, setTrendingContent] = useState<Movie[]>([]);
  const [allMovies, setAllMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [showAllMovies, setShowAllMovies] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<Movie[]>([]);
  const [profilePicture, setProfilePicture] = useState(user?.photoURL || "");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch trending (mixed movies and TV shows)
        const trendingRes = await fetch(
          'https://api.themoviedb.org/3/trending/all/day?language=en-US',
          {
            headers: {
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_TMDB_API_READ_ACCESS_TOKEN}`,
            },
          }
        );
        const trendingData = await trendingRes.json();
        
        // Fetch popular movies for "All Movies" section
        const moviesRes = await fetch(
          'https://api.themoviedb.org/3/movie/popular?language=en-US&page=1',
          {
            headers: {
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_TMDB_API_READ_ACCESS_TOKEN}`,
            },
          }
        );
        const moviesData = await moviesRes.json();
        
        // Fetch second page for more movies
        const moviesRes2 = await fetch(
          'https://api.themoviedb.org/3/movie/popular?language=en-US&page=2',
          {
            headers: {
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_TMDB_API_READ_ACCESS_TOKEN}`,
            },
          }
        );
        const moviesData2 = await moviesRes2.json();
        
        // Filter out people, only keep movies and TV shows
        const mixedContent = trendingData.results
          .filter((item: Movie) => item.media_type !== 'person')
          .slice(0, 12);

        setFeaturedMovie(mixedContent[0]);
        setTrendingContent(mixedContent.slice(1));
        setAllMovies([...moviesData.results, ...moviesData2.results]); // 40 movies total
        setLoading(false);
      } catch (error) {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchDropdownRef.current &&
        !searchDropdownRef.current.contains(event.target as Node) &&
        !searchInputRef.current?.contains(event.target as Node)
      ) {
        setShowSearchDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync profile picture
  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      if (doc.exists() && doc.data().photoURL) {
        const newPhotoURL = doc.data().photoURL;
        setProfilePicture(newPhotoURL);
        
        if (projectAuth.currentUser) {
          try {
            updateProfile(projectAuth.currentUser, {
              photoURL: newPhotoURL
            }).catch(() => {
              // Silent error handling
            });
          } catch (error) {
          }
        }
      }
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // Search suggestions from trending and all movies
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      const allContent = [...trendingContent, ...allMovies];
      const query = searchQuery.toLowerCase().trim();
      
      const filtered = allContent
        .filter(item => {
          const title = getTitle(item).toLowerCase();
          return title.includes(query);
        })
        .slice(0, 8); // Show more suggestions
      
      setSearchSuggestions(filtered);
      setShowSearchDropdown(true); // Always show dropdown when typing
    } else {
      setSearchSuggestions([]);
      setShowSearchDropdown(false);
    }
  }, [searchQuery, trendingContent, allMovies]);

  const handleScroll = (direction: 'left' | 'right') => {
    const container = document.getElementById('trending-scroll');
    if (container) {
      const scrollAmount = 280;
      const newPosition = direction === 'left' 
        ? Math.max(0, scrollPosition - scrollAmount)
        : scrollPosition + scrollAmount;
      
      container.scrollTo({ left: newPosition, behavior: 'smooth' });
      setScrollPosition(newPosition);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowSearchDropdown(false);
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSuggestionClick = (item: Movie) => {
    setShowSearchDropdown(false);
    const path = item.media_type === 'tv' ? 'tv-shows' : 'movies';
    router.push(`/${path}/${item.id}`);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    searchInputRef.current?.focus();
  };

  const getInitials = (name: string) => {
    return (
      name
        ?.split(" ")
        .map((word) => word[0])
        .join("")
        .toUpperCase() || "U"
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const getTitle = (item: Movie) => item.title || item.name || 'Untitled';
  const getDate = (item: Movie) => item.release_date || item.first_air_date || '';
  const getYear = (date: string) => date ? new Date(date).getFullYear() : '';

  return (
    <div className="min-h-screen bg-black pb-20">
      {/* Safe area padding for iPhone status bar */}
      <div className="h-safe-top" />
      
      {/* Search Bar with Profile - Real input field with purple icon and dropdown */}
      <div className="px-4 pt-4 pb-2 relative flex items-center gap-3">
        <form onSubmit={handleSearch} className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500 pointer-events-none z-10" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery && setShowSearchDropdown(true)}
            placeholder="Search movies, TV shows..."
            className="w-full pl-12 pr-12 py-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white transition-colors"
              aria-label="Clear search"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </form>

        {/* Profile Avatar Button - Mobile Only */}
        <button
          onClick={() => router.push('/user/profile')}
          className="p-1 rounded-full hover:bg-white/10 transition-colors flex-shrink-0"
          title="Profile"
        >
          <Avatar className="w-10 h-10 border border-white/20">
            <AvatarImage src={profilePicture} />
            <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-sm">
              {user && getInitials(user?.displayName || user?.email || "User")}
            </AvatarFallback>
          </Avatar>
        </button>

        {/* Search Dropdown - Classy look */}
        {showSearchDropdown && searchQuery.trim() && (
          <motion.div
            ref={searchDropdownRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute left-4 right-20 top-full mt-2 bg-black/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50 max-h-[400px] overflow-y-auto"
          >
            {searchSuggestions.length > 0 ? (
              <>
                {searchSuggestions.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleSuggestionClick(item)}
                    className="flex items-center gap-3 p-3 hover:bg-white/10 cursor-pointer transition-colors border-b border-white/5 last:border-b-0"
                  >
                    {item.poster_path && (
                      <div className="relative w-12 h-16 flex-shrink-0 rounded-md overflow-hidden">
                        <Image
                          src={`https://image.tmdb.org/t/p/w92${item.poster_path}`}
                          alt={getTitle(item)}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white font-medium truncate">{getTitle(item)}</h4>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span className="px-1.5 py-0.5 rounded bg-white/10">
                          {item.media_type === 'tv' ? 'TV' : 'Movie'}
                        </span>
                        {getYear(getDate(item)) && (
                          <span>{getYear(getDate(item))}</span>
                        )}
                        {item.vote_average && (
                          <>
                            <span>•</span>
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                              <span>{item.vote_average.toFixed(1)}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </>
            ) : (
              <div className="p-4 text-center text-gray-400">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No results found for "{searchQuery}"</p>
                <p className="text-xs mt-1">Press Enter to search all content</p>
              </div>
            )}
          </motion.div>
        )}
      </div>
      
      {/* Today's Featured - Rectangular Medium Rounded Card */}
      {featuredMovie && (
        <div className="p-4 pt-6">
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-500" />
            Today's Featured
          </h2>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => {
              const path = featuredMovie.media_type === 'tv' ? 'tv-shows' : 'movies';
              router.push(`/${path}/${featuredMovie.id}`);
            }}
            className="relative h-48 rounded-2xl overflow-hidden cursor-pointer"
          >
            {/* Background Image */}
            <Image
              src={`https://image.tmdb.org/t/p/original${featuredMovie.backdrop_path || featuredMovie.poster_path}`}
              alt={getTitle(featuredMovie)}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

            {/* Content */}
            <div className="absolute inset-0 flex flex-col justify-end p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="px-2 py-1 rounded-md bg-indigo-600/90 text-xs font-medium whitespace-nowrap">
                  {featuredMovie.media_type === 'tv' ? 'TV Show' : 'Movie'}
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                  <span>{featuredMovie.vote_average.toFixed(1)}</span>
                </div>
              </div>
              
              <h3 className="text-xl font-bold mb-1 line-clamp-2">
                {getTitle(featuredMovie)}
              </h3>
              
              <p className="text-xs text-gray-300 line-clamp-2 mb-3">
                {featuredMovie.overview}
              </p>

              <Button
                className="w-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:via-indigo-400 hover:to-indigo-500 text-white font-medium relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent"
                onClick={(e) => {
                  e.stopPropagation();
                  const path = featuredMovie.media_type === 'tv' ? 'tv-shows' : 'movies';
                  router.push(`/${path}/${featuredMovie.id}`);
                }}
              >
                <Play className="w-4 h-4 mr-2 fill-white" />
                Watch Trailer
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Trending Now - Single Row Horizontal Scroll with Classy Arrows */}
      <div className="px-4 mt-2 relative">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg font-bold">Trending Now</h2>
          </div>
        </div>

        {/* Single Row Horizontal Scroll */}
        <div className="relative">
          {/* Left Arrow - Classy overlay */}
          <button
            onClick={() => handleScroll('left')}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/60 backdrop-blur-sm hover:bg-black/80 transition-all duration-200 shadow-lg border border-white/10"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Right Arrow - Classy overlay */}
          <button
            onClick={() => handleScroll('right')}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/60 backdrop-blur-sm hover:bg-black/80 transition-all duration-200 shadow-lg border border-white/10"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Single Row Grid with Horizontal Scroll */}
          <div
            id="trending-scroll"
            className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide scroll-smooth"
          >
            {trendingContent.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.03 }}
                onClick={() => {
                  const path = item.media_type === 'tv' ? 'tv-shows' : 'movies';
                  router.push(`/${path}/${item.id}`);
                }}
                className="cursor-pointer flex-shrink-0 w-[140px]"
              >
                <div className="relative aspect-[2/3] rounded-lg overflow-hidden mb-2">
                  <Image
                    src={`https://image.tmdb.org/t/p/w342${item.poster_path}`}
                    alt={getTitle(item)}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm rounded-full px-2 py-0.5 flex items-center gap-1">
                    <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                    <span className="text-xs">{item.vote_average.toFixed(1)}</span>
                  </div>
                  <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-white/20 backdrop-blur-sm text-[10px] font-medium">
                    {item.media_type === 'tv' ? 'TV' : 'Movie'}
                  </div>
                </div>
                <h3 className="text-xs font-medium line-clamp-2">{getTitle(item)}</h3>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* All Movies - 2 Column Grid (2x10) with Load More */}
      <div className="px-4 mt-6">
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          <Film className="w-5 h-5 text-indigo-500" />
          All Movies
        </h2>
        
        <div className="grid grid-cols-2 gap-3">
          {allMovies.slice(0, showAllMovies ? allMovies.length : 20).map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.02 }}
              onClick={() => router.push(`/movies/${item.id}`)}
              className="cursor-pointer active:scale-95 transition-transform"
            >
              {/* Poster */}
              <div className="relative aspect-[2/3] rounded-lg overflow-hidden mb-2">
                <Image
                  src={`https://image.tmdb.org/t/p/w342${item.poster_path}`}
                  alt={getTitle(item)}
                  fill
                  className="object-cover"
                />
                <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm rounded-full px-1.5 py-0.5 flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                  <span className="text-xs">{item.vote_average.toFixed(1)}</span>
                </div>
              </div>

              {/* Info */}
              <div>
                <h3 className="font-semibold text-sm line-clamp-2 mb-1">
                  {getTitle(item)}
                </h3>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  {getYear(getDate(item)) && (
                    <span>{getYear(getDate(item))}</span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Load More Button */}
        {!showAllMovies && allMovies.length > 20 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="mt-4"
          >
            <Button
              onClick={() => setShowAllMovies(true)}
              className="w-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:via-indigo-400 hover:to-indigo-500 text-white font-medium relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent"
            >
              Load More Movies
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
