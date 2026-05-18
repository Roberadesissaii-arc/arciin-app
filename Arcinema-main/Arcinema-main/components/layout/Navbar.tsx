/* eslint-disable @typescript-eslint/no-explicit-any */
// components/layout/Navbar.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  X,
  Bell,
  User,
  Settings,
  LogOut,
  Heart,
  History,
  UserCircle,
  Menu,
  Loader2,
  Activity,
  ChevronDown,
  HelpCircle,
  Check,
  Share2,
} from "lucide-react";
import { projectAuth } from "@/firebase/config";
import { useAuth } from "@/contexts/AuthContext";
import { useSidebar } from "@/contexts/SidebarContext";
import { cn } from "@/lib/utils";
import { useUserSettings } from "@/hooks/useUserSettings";
import { filterSearchResults } from "@/lib/features/filters/contentFilter";
// import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarPath } from '@/lib/utils/profileAvatars';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
// } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useToast } from "@/components/ui/use-toast";
import { useUserStats } from '@/hooks/useUserStats';
import { useActivityTracking } from '@/hooks/useActivityTracking';
import { doc, onSnapshot } from 'firebase/firestore';
import { projectFirestore as db } from '@/firebase/config';
import { updateProfile } from 'firebase/auth';
import { useNotifications } from '@/hooks/useNotifications';

const publicRoutes = ["/auth/login", "/auth/signup"];

interface SearchResult {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path?: string;
  release_date?: string;
  type: 'movie' | 'tv' | 'person'; // This property will determine the content type
}

interface QuickStatsProps {
  stats: {
    watchlistCount: number;
    reviewsCount: number;
    likesCount: number;
    foldersSharedCount: number;
    sharedWithUsers: string[];
    followingCount: number;
    followersCount: number;
    lastUpdated?: string;
  };
  statsLoading: boolean;
  router: any; // You could use Router type from next/router if needed
  settings: any; // Add settings prop
}

const QuickStats = ({ stats, statsLoading, router, settings }: QuickStatsProps) => (
  <div className="grid grid-cols-2 gap-4 mt-4 text-center">
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
      onClick={() => router.push('/user/my-list')}
    >
      {statsLoading ? (
        <Loader2 className="w-4 h-4 mx-auto animate-spin text-gray-400" />
      ) : (
        <>
          <div className="font-semibold text-indigo-400">
            {settings?.privacy?.showWatchlist ? stats.watchlistCount : '--'}
          </div>
          <div className="text-xs text-gray-400">Watchlist</div>
        </>
      )}
    </motion.div>

    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
      onClick={() => router.push('/user/likes')}
    >
      {statsLoading ? (
        <Loader2 className="w-4 h-4 mx-auto animate-spin text-gray-400" />
      ) : (
        <>
          <div className="font-semibold text-indigo-400">
            {settings?.privacy?.showLikedMovies ? stats.likesCount : '--'}
          </div>
          <div className="text-xs text-gray-400">Liked</div>
        </>
      )}
    </motion.div>

    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
      onClick={() => router.push('/user/my-list?tab=following')}
    >
      {statsLoading ? (
        <Loader2 className="w-4 h-4 mx-auto animate-spin text-gray-400" />
      ) : (
        <>
          <div className="font-semibold text-indigo-400">
            {stats.followingCount}
          </div>
          <div className="text-xs text-gray-400">Following</div>
        </>
      )}
    </motion.div>

    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
      onClick={() => router.push('/user/my-list?tab=followers')}
    >
      {statsLoading ? (
        <Loader2 className="w-4 h-4 mx-auto animate-spin text-gray-400" />
      ) : (
        <>
          <div className="font-semibold text-indigo-400">
            {stats.followersCount}
          </div>
          <div className="text-xs text-gray-400">Followers</div>
        </>
      )}
    </motion.div>

    {stats.lastUpdated && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="col-span-2 text-xs text-gray-500 text-center mt-2"
      >
        Updated {new Date(stats.lastUpdated).toLocaleTimeString()}
      </motion.div>
    )}
  </div>
);

const Navbar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const { toast } = useToast();
  const { settings } = useUserSettings();
  const { sidebarOpen } = useSidebar();
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]); // Updated type here
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileCategoriesOpen, setIsMobileCategoriesOpen] = useState(false);
  const { stats, loading: statsLoading } = useUserStats(user?.uid);
  const { trackSearch } = useActivityTracking();
  const [avatarId, setAvatarId] = useState<string | undefined>();
  const { notifications, unreadCount, loading: notificationsLoading, markAsRead, markAllAsRead } = useNotifications();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const searchTimer = setTimeout(async () => {
      if (searchQuery.trim()) {
        const searchContent = async (type: 'movie' | 'tv' | 'person') => {
          const url = `https://api.themoviedb.org/3/search/${type}?query=${encodeURIComponent(
            searchQuery
          )}&language=en-US&page=1&include_adult=${settings?.preferences?.contentFilter === 'all'}`;
          const response = await fetch(url, {
            headers: {
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_TMDB_API_READ_ACCESS_TOKEN}`,
            },
          });
          if (!response.ok) throw new Error('Network response was not ok');
          const data = await response.json();
          
          if (type === 'person') {
            return data.results.slice(0, 2).map((item: any) => ({
              id: item.id,
              title: item.name,
              overview: `Actor/Director • Known for: ${item.known_for?.map((k: any) => k.title || k.name).slice(0, 2).join(', ') || 'Various works'}`,
              poster_path: item.profile_path,
              release_date: '',
              type: 'person',
            }));
          } else {
            return data.results.slice(0, 3).map((item: any) => ({
              id: item.id,
              title: item.title || item.name,
              overview: item.overview,
              poster_path: item.poster_path,
              release_date: item.release_date || item.first_air_date,
              type: type,
            }));
          }
        };

        try {
          const [movieResults, tvResults, personResults] = await Promise.all([
            searchContent('movie'),
            searchContent('tv'),
            searchContent('person')
          ]);
          
          let allResults = [...movieResults, ...tvResults, ...personResults];
          
          // Apply content filtering based on user settings
          const contentFilterLevel = settings?.preferences?.contentFilter || 'filtered';
          if (contentFilterLevel !== 'all') {
            allResults = filterSearchResults(allResults, contentFilterLevel);
          }
          
          setSearchResults(allResults);
        } catch (error) {
          // Silently handle search errors to avoid console spam
          setSearchResults([]);
        }
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(searchTimer);
  }, [searchQuery, settings?.preferences?.contentFilter]);
  

  const handleSearchSelect = (result: SearchResult) => {
    // Track the search activity
    if (user) {
      trackSearch(searchQuery.trim());
    }
    
    setSearchOpen(false);
    setSearchQuery("");
    setSearchResults([]);
    
    // Navigate based on type
    if (result.type === 'person') {
      router.push(`/person/${result.id}`);
    } else if (result.type === 'movie') {
      router.push(`/movies/${result.id}`);
    } else {
      router.push(`/tv-shows/${result.id}`);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Track the search activity
      if (user) {
        trackSearch(searchQuery.trim());
      }
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchOpen(false);
      setSearchQuery("");
    }
  };

  const handleSignOut = async () => {
    try {
      await projectAuth.signOut();
      toast({
        title: "Signed out successfully",
        description: "See you next time!",
      });
      router.push("/auth/login");
    } catch (error) {
      toast({
        title: "Error signing out",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
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

  const navLinks = [
    { title: "Movies", href: "/movies" },
    { title: "TV Shows", href: "/tv-shows" },
    { title: "Anime", href: "/anime" },
    { title: "New Releases", href: "/new-releases" },
  ];

  const handleCategorySelect = (genreId: number, categoryTitle: string) => {
    const preferredCountry = settings?.preferences?.country || 'US';
    const countryName = preferredCountry === 'US' ? 'American' : 
                       preferredCountry === 'GB' ? 'British' :
                       preferredCountry === 'CA' ? 'Canadian' :
                       preferredCountry === 'AU' ? 'Australian' :
                       preferredCountry === 'FR' ? 'French' :
                       preferredCountry === 'DE' ? 'German' :
                       preferredCountry === 'IT' ? 'Italian' :
                       preferredCountry === 'ES' ? 'Spanish' :
                       'International';
    
    // Show toast notification with enhanced filtering info
    const enhancedDescription = categoryTitle === 'Romance' || categoryTitle === 'Drama' 
      ? `Filtering by ${categoryTitle} - showing high-quality ${countryName !== 'International' ? countryName : 'English-language'} content only`
      : `Filtering by ${categoryTitle} ${countryName !== 'International' ? `(${countryName} content prioritized)` : ''}`;
    
    toast({
      title: "Enhanced Filter Applied",
      description: enhancedDescription,
      duration: 3000,
    });

    // Check if we're not on homepage - redirect first
    if (pathname !== '/') {
      // Store filter data in sessionStorage so homepage can apply it
      sessionStorage.setItem('pendingGenreFilter', JSON.stringify({ genreId, categoryTitle }));
      // Redirect to homepage
      router.push('/');
      return;
    }

    // If already on homepage, scroll and apply filter
    setTimeout(() => {
      const movieSectionElement = document.querySelector('[data-movie-section]') || 
                                  document.querySelector('[data-movie-grid]') ||
                                  document.querySelector('.movie-grid-container');
      if (movieSectionElement) {
        movieSectionElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }
    }, 100);

    // Dispatch a custom event to notify the current page about genre filter change
    const filterEvent = new CustomEvent('genreFilterChange', {
      detail: { genreId, categoryTitle }
    });
    window.dispatchEvent(filterEvent);
  };

const categoryLinks = [
    { title: "Action", genreId: 28 },           // 6 characters
    { title: "Adventure", genreId: 12 },        // 9 characters
    { title: "Animation", genreId: 16 },        // 9 characters
    { title: "Biography", genreId: 36 },         // 9 characters (also fixes History)
    { title: "Drama", genreId: 18 },             // 5 characters
    { title: "Comedy", genreId: 35 },           // 6 characters
    { title: "Crime", genreId: 80 },             // 5 characters
    { title: "Documentary", genreId: 99 },      // 11 characters
    { title: "Family", genreId: 10751 },        // 6 characters
    { title: "Fantasy", genreId: 14 },           // 7 characters
    { title: "History", genreId: 36 },           // 7 characters (also fixes Biography)
    { title: "Music", genreId: 10402 },          // 5 characters
    { title: "Mystery", genreId: 9648 },         // 7 characters
    { title: "Romance", genreId: 10749 },        // 7 characters
    { title: "Science Fiction", genreId: 878 },  // 15 characters (same as Sci-Fi)
    { title: "Thriller", genreId: 53 },          // 8 characters
    { title: "War", genreId: 10752 },             // 3 characters
    { title: "Western", genreId: 37 },            // 7 characters
];



  // Add useEffect for click outside handling
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if click is outside the mobile menu
      const nav = document.querySelector('nav');
      if (nav && !nav.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
        setIsMobileCategoriesOpen(false);
        setSearchOpen(false);
        setSearchQuery("");
        setSearchResults([]);
      }
    };

    // Add event listener if menu is open
    if (isMobileMenuOpen || searchOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    // Close mobile categories when mobile menu closes
    if (!isMobileMenuOpen) {
      setIsMobileCategoriesOpen(false);
    }

    // Cleanup
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileMenuOpen, searchOpen]);

  // Listen for avatar changes in real-time
  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      if (doc.exists() && doc.data().avatarId) {
        setAvatarId(doc.data().avatarId);
      }
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const handleNotificationClick = async (notification: any) => {
    // Mark as read with a small delay
    setTimeout(async () => {
      if (!notification.isRead) {
        await markAsRead(notification.id);
      }
    }, 150);
    
    // Handle different notification types
    if (notification.type === 'collaborative_folder' || notification.type === 'folder_share') {
      // Navigate to shared folders page where user can accept/decline
      router.push('/user/shared-folders');
    } else if (notification.movieData?.id) {
      // Navigate to movie/show page
      router.push(`/movies/${notification.movieData.id}`);
    }
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  if (publicRoutes.includes(pathname)) {
    return null;
  }

  if (!user) {
    return null;
  }

  // Hide navbar on AI chat pages and messages pages
  if (pathname === '/ai-chat' || pathname === '/cineai' || pathname?.startsWith('/messages')) {
    return null;
  }

  return (
    <div className={cn(
      "fixed top-0 z-50 transition-all duration-300",
      // Hide on mobile and desktop (sidebar handles desktop), show on tablet/laptop only
      "hidden md:block xl:hidden",
      // Match homepage navigation width - always account for collapsed sidebar space
      // On tablet (md/lg), center the nav; on xl, account for sidebar
      pathname === '/'
        ? (sidebarOpen
            ? "md:left-1/2 md:-translate-x-1/2 md:w-[calc(100%-2rem)] lg:w-[calc(100%-4rem)] xl:left-auto xl:translate-x-0 xl:ml-[240px] xl:w-[calc(100%-240px)]"
            : "md:left-1/2 md:-translate-x-1/2 md:w-[calc(100%-2rem)] lg:w-[calc(100%-4rem)] xl:left-auto xl:translate-x-0 xl:ml-[60px] xl:w-[calc(100%-60px)]")
        : "md:left-1/2 md:-translate-x-1/2 md:w-[calc(100%-2rem)] lg:w-[calc(100%-4rem)] xl:left-auto xl:translate-x-0 xl:ml-[60px] xl:w-[calc(100%-60px)]",
      pathname === '/ai-chat' || pathname === '/cineai' ? 'hidden 2xl:block navbar-ai-chat' : '',
      // Add safe area class for PWA mode
      "pwa-safe-navbar"
    )}>
      <nav className={cn(
        "mx-2 md:mx-4 xl:mx-8 transition-all duration-300",
        "rounded-2xl",
        isScrolled 
          ? "bg-black/80 backdrop-blur-sm border border-white/10 my-2" 
          : "bg-transparent my-4"
      )}>
        {/* Tablet and Laptop Layout - Show on medium and larger screens */}
        <div className="flex items-center justify-between w-full px-4 py-2">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl md:text-2xl font-galindo text-white hover:text-gray-200 transition-colors">
              Arcinema
            </span>
          </Link>

          {/* Navigation Links - Show on all non-mobile screens */}
          <div className="hidden md:flex items-center gap-2 lg:gap-4 xl:gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.title}
                href={link.href}
                className={cn(
                  "text-xs lg:text-sm font-medium transition-colors relative px-2 lg:px-3 py-2 rounded-lg whitespace-nowrap",
                  pathname === link.href
                    ? "text-indigo-500 bg-indigo-500/10"
                    : "text-gray-200 hover:text-white hover:bg-white/5"
                )}
              >
                {link.title}
                {pathname === link.href && (
                  <motion.div
                    layoutId="navbar-active-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-400 via-indigo-500 to-indigo-600 rounded-full"
                    transition={{ type: "spring", bounce: 0.2 }}
                  />
                )}
              </Link>
            ))}
            
            {/* Categories Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={cn(
                  "text-xs lg:text-sm font-medium transition-colors relative px-2 lg:px-3 py-2 rounded-lg flex items-center gap-1 whitespace-nowrap",
                  "text-gray-200 hover:text-white hover:bg-white/5"
                )}>
                  Categories
                  <ChevronDown className="w-3 h-3 lg:w-4 lg:h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-44 lg:w-48 bg-black/40 backdrop-blur-3xl border border-white/20 rounded-lg shadow-2xl p-0 overflow-hidden mt-2"
                style={{ backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}
              >
                <div className="max-h-[252px] overflow-y-auto scrollbar-hide relative" id="category-dropdown-scroll">
                  {categoryLinks.map((category, index) => (
                    <DropdownMenuItem
                      key={category.title}
                      className="focus:bg-white/20 hover:bg-white/15 px-3 py-1.5 text-sm text-white/90"
                      onClick={() => handleCategorySelect(category.genreId, category.title)}
                    >
                      {category.title}
                    </DropdownMenuItem>
                  ))}
                  {/* Custom scroll indicator at bottom center - shows when there are more than 7 items */}
                  {categoryLinks.length > 7 && (
                    <div 
                      className="sticky bottom-0 left-0 right-0 flex justify-center pb-1.5 pt-1 bg-gradient-to-t from-black/95 via-black/90 to-transparent z-10 cursor-pointer group"
                      onClick={(e) => {
                        e.stopPropagation();
                        const scrollContainer = document.getElementById('category-dropdown-scroll');
                        if (scrollContainer) {
                          scrollContainer.scrollBy({ top: 100, behavior: 'smooth' });
                        }
                      }}
                      onMouseEnter={(e) => {
                        const scrollContainer = document.getElementById('category-dropdown-scroll');
                        if (scrollContainer) {
                          scrollContainer.scrollBy({ top: 100, behavior: 'smooth' });
                        }
                      }}
                    >
                      <ChevronDown className="w-3.5 h-3.5 text-white/70 group-hover:text-white group-hover:scale-110 transition-all duration-200" />
                    </div>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-1 md:gap-2 lg:gap-4">
            {/* Search */}
            {searchOpen ? (
              <div className="w-40 md:w-56 lg:w-72 relative z-[100]" id="search-container">
                <form onSubmit={handleSearch} className="relative">
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search movies & shows..."
                    className={cn(
                      "w-full pl-4 pr-10 py-2 rounded-full",
                      "bg-black/60 border border-white/20",
                      "text-sm text-white placeholder-gray-400",
                      "focus:outline-none focus:border-purple-500"
                    )}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setSearchOpen(false);
                      setSearchQuery("");
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    aria-label="Close search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </form>

                {/* Search Results Dropdown - Using absolute positioning to overlay without stretching navbar */}
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 mx-2 bg-black/95 rounded-2xl border border-white/10 shadow-2xl overflow-hidden max-h-96 z-50">
                    <div className="overflow-y-auto max-h-96">
                      {searchResults.map((result) => (
                        <button
                          key={result.id}
                          onClick={() => handleSearchSelect(result)}
                          className="flex items-center gap-3 p-2.5 hover:bg-white/5 transition-colors w-full text-left"
                        >
                          {result.poster_path ? (
                            <div className="relative w-10 h-14">
                              <Image
                                src={`https://image.tmdb.org/t/p/w92${result.poster_path}`}
                                alt={result.title || result.name || 'Media content'}
                                fill
                                sizes="40px"
                                className="object-cover rounded"
                              />
                            </div>
                          ) : (
                            <div className="w-10 h-14 bg-gray-800 rounded flex items-center justify-center">
                              <User className="w-6 h-6 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium line-clamp-1">
                              {result.title || result.name}
                            </p>
                            <p className="text-sm text-gray-400">
                              {result.type === 'person' ? 'Person' : 
                               result.release_date
                                ? new Date(result.release_date).getFullYear()
                                : "N/A"}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                    {/* Scroll indicator - show if content is scrollable */}
                    {searchResults.length > 4 && (
                      <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/95 to-transparent pointer-events-none flex items-end justify-center pb-2">
                        <ChevronDown className="w-5 h-5 text-gray-400 animate-bounce" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setSearchOpen(true)}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
                title="Search"
              >
                <Search className="w-5 h-5" />
              </button>
            )}

            {/* Notifications - Show on tablet and larger screens */}
            <div className="hidden md:block">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    title="Notifications"
                    className="relative p-2 rounded-full hover:bg-white/10 transition-colors"
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <div className="absolute -top-1 -right-1 bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </div>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-80 bg-black/40 backdrop-blur-3xl border border-white/20 rounded-2xl shadow-2xl mt-2"
                  style={{ backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}
                >
                  <DropdownMenuLabel className="px-4 py-3 border-b border-white/10">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Notifications</h3>
                      {unreadCount > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleMarkAllAsRead}
                          className="text-xs text-gray-400 hover:text-white hover:bg-white/10 px-2 py-1"
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Mark all read
                        </Button>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                      </p>
                    )}
                  </DropdownMenuLabel>
                  <div className="py-2">
                    {notificationsLoading ? (
                      <div className="p-4 text-center">
                        <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto mb-2" />
                        <p className="text-xs text-gray-400">Loading notifications...</p>
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="px-4 py-6 text-center text-sm text-gray-400">
                        <Bell className="w-8 h-8 mx-auto mb-2 text-gray-500" />
                        <p>No new notifications</p>
                        <p className="text-gray-500 text-xs mt-1">
                          We'll notify you about new releases and updates
                        </p>
                      </div>
                    ) : (
                      <>
                        {notifications.slice(0, 3).map((notification) => (
                          <div
                            key={notification.id}
                            onClick={() => handleNotificationClick(notification)}
                            className={cn(
                              "flex items-start gap-3 p-3 hover:bg-white/5 cursor-pointer transition-colors border-b border-white/5 last:border-b-0",
                              !notification.isRead && "bg-blue-500/5"
                            )}
                          >
                            {notification.movieData?.poster_path ? (
                              <div className="relative w-10 h-14 flex-shrink-0">
                                <Image
                                  src={`https://image.tmdb.org/t/p/w92${notification.movieData.poster_path}`}
                                  alt={notification.movieData?.title || 'Movie'}
                                  fill
                                  sizes="40px"
                                  className="object-cover rounded"
                                />
                              </div>
                            ) : (
                              <div className="w-10 h-14 bg-gray-700 rounded flex items-center justify-center flex-shrink-0">
                                <Bell className="w-5 h-5 text-gray-400" />
                              </div>
                            )}
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <h4 className={cn(
                                  "text-sm font-medium line-clamp-1",
                                  notification.isRead ? "text-gray-300" : "text-white"
                                )}>
                                  {notification.title}
                                </h4>
                                {!notification.isRead && (
                                  <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 mt-1 flex-shrink-0"></div>
                                )}
                              </div>
                              <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                                {notification.message || 'No message'}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {notification.createdAt ? (
                                  new Date(notification.createdAt).toLocaleDateString()
                                ) : (
                                  'No date available'
                                )}
                              </p>
                            </div>
                          </div>
                        ))}
                        
                        {notifications.length > 3 && (
                          <div className="px-3 py-2 border-t border-white/10">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full text-xs text-gray-400 hover:text-white hover:bg-white/10"
                              onClick={() => router.push('/notifications')}
                            >
                              View All Notifications ({notifications.length - 3} more)
                            </Button>
                          </div>
                        )}
                        
                        {notifications.length <= 3 && notifications.length > 0 && (
                          <div className="px-3 py-2 border-t border-white/10">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full text-xs text-gray-400 hover:text-white hover:bg-white/10"
                              onClick={() => router.push('/notifications')}
                            >
                              View All Notifications
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Profile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1 rounded-full hover:bg-white/10 transition-colors">
                  <Avatar className="w-8 h-8 border border-white/20">
                    <AvatarImage src={getAvatarPath(avatarId)} alt="Profile" />
                    <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-sm">
                      {getInitials(user?.displayName || user?.email || "User")}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-80 bg-black/40 backdrop-blur-3xl border border-white/20 rounded-2xl shadow-2xl mt-2"
                style={{ backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}
              >
                {/* Profile Header */}
                <div className="p-4 border-b border-white/10">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-16 h-16 border-2 border-white/20">
                      <AvatarImage src={getAvatarPath(avatarId)} alt="Profile" />
                      <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-xl">
                        {getInitials(user?.displayName || user?.email || "User")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">
                        {user?.displayName || "User"}
                      </h3>
                      <p className="text-sm text-gray-400">{user?.email}</p>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <QuickStats stats={stats} statsLoading={statsLoading} router={router} settings={settings} />
                </div>

                {/* Menu Items */}
                <DropdownMenuGroup>
                  <DropdownMenuItem 
                    className="focus:bg-white/5 px-4 py-3"
                    onClick={() => router.push('/user/profile')}
                  >
                    <UserCircle className="w-4 h-4 mr-3" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="focus:bg-white/5 px-4 py-3"
                    onClick={() => router.push('/user/settings')}
                  >
                    <Settings className="w-4 h-4 mr-3" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="focus:bg-white/5 px-4 py-3"
                    onClick={() => router.push('/user/my-list')}
                  >
                    <Heart className="w-4 h-4 mr-3" />
                    My List
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="focus:bg-white/5 px-4 py-3"
                    onClick={() => router.push('/user/activity')}
                  >
                    <Activity className="w-4 h-4 mr-3" />
                    Activity
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="focus:bg-white/5 px-4 py-3"
                    onClick={() => router.push('/user/shared-folders')}
                  >
                    <Share2 className="w-4 h-4 mr-3" />
                    Shared Folders
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="focus:bg-white/5 px-4 py-3"
                    onClick={() => router.push('/ai-chat')}
                  >
                    <HelpCircle className="w-4 h-4 mr-3" />
                    Help Center
                  </DropdownMenuItem>
                </DropdownMenuGroup>

                <DropdownMenuSeparator className="bg-white/10" />

                <DropdownMenuItem
                  className="focus:bg-white/5 px-4 py-3 text-indigo-500"
                  onClick={handleSignOut}
                >
                  <LogOut className="w-4 h-4 mr-3" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mobile/Tablet Menu Dropdown */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden border-t border-white/10 bg-black/70 backdrop-blur-sm rounded-b-2xl"
            >
              <div className="p-3 space-y-2">
                {/* Search Bar */}
                <div className="relative px-2">
                  <form onSubmit={handleSearch} className="relative">
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search movies & shows..."
                      className={cn(
                        "w-full pl-9 pr-3 py-2 rounded-lg",
                        "bg-white/10 border border-white/10",
                        "text-sm text-white placeholder-gray-400",
                        "focus:outline-none focus:border-purple-500",
                        "transition-all duration-300"
                      )}
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </form>

                  {searchResults.length > 0 && (
                    <div className="absolute top-full mt-2 left-0 right-0 bg-black/95 rounded-lg border border-white/10 shadow-xl overflow-hidden mx-2 max-h-[320px] z-50">
                      <div className="overflow-y-auto max-h-[320px]">
                        {searchResults.map((result) => (
                          <button
                            key={result.id}
                            onClick={() => {
                              handleSearchSelect(result);
                              setIsMobileMenuOpen(false);
                            }}
                            className="flex items-center gap-3 p-2.5 hover:bg-white/5 transition-colors w-full text-left"
                          >
                            {result.poster_path ? (
                              <div className="relative w-10 h-14">
                                <Image
                                  src={`https://image.tmdb.org/t/p/w92${result.poster_path}`}
                                  alt={result.title || result.name || 'Media content'}
                                  fill
                                  sizes="40px"
                                  className="object-cover rounded"
                                />
                              </div>
                            ) : (
                              <div className="w-10 h-14 bg-gray-800 rounded flex items-center justify-center">
                                <User className="w-6 h-6 text-gray-400" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium line-clamp-1">
                                {result.title || result.name}
                              </p>
                              <p className="text-sm text-gray-400">
                                {result.type === 'person' ? 'Person' : 
                                 result.release_date
                                  ? new Date(result.release_date).getFullYear()
                                  : "N/A"}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                      {/* Scroll indicator for mobile - show if content is scrollable */}
                      {searchResults.length > 5 && (
                        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/95 to-transparent pointer-events-none flex items-end justify-center pb-2">
                          <ChevronDown className="w-5 h-5 text-gray-400 animate-bounce" />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Navigation Links */}
                <div className="px-2">
                  {navLinks.map((link) => (
                    <Link
                      key={link.title}
                      href={link.href}
                      className={cn(
                        "block px-3 py-2 text-sm font-medium rounded-lg transition-colors relative",
                        pathname === link.href
                          ? "text-indigo-500 bg-indigo-500/10"
                          : "text-gray-200 hover:text-white hover:bg-white/10"
                      )}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {link.title}
                      {pathname === link.href && (
                        <motion.div
                          layoutId="mobile-navbar-active-indicator"
                          className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-400 via-indigo-500 to-indigo-600 rounded-r-full"
                          transition={{ type: "spring", bounce: 0.2 }}
                        />
                      )}
                    </Link>
                  ))}
                  
                  {/* Categories Section for Mobile */}
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <button
                      onClick={() => setIsMobileCategoriesOpen(!isMobileCategoriesOpen)}
                      className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    >
                      Categories
                      <ChevronDown className={cn(
                        "w-4 h-4 transition-transform duration-200",
                        isMobileCategoriesOpen && "rotate-180"
                      )} />
                    </button>
                    
                    <AnimatePresence>
                      {isMobileCategoriesOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-2 ml-2 space-y-1">
                            {categoryLinks.map((category) => (
                              <button
                                key={category.title}
                                onClick={() => {
                                  handleCategorySelect(category.genreId, category.title);
                                  setIsMobileMenuOpen(false);
                                  setIsMobileCategoriesOpen(false);
                                }}
                                className="block w-full text-left px-3 py-2 text-sm font-medium rounded-lg transition-colors text-gray-200 hover:text-white hover:bg-white/10"
                              >
                                {category.title}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </div>
  );
};

export default Navbar;
