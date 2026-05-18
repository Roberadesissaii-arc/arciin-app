"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";
import { doc, getDoc } from 'firebase/firestore';
import { projectFirestore as db } from '@/firebase/config';
import { getAvatarPath } from '@/lib/utils/profileAvatars';
import {
  Loader2,
  ArrowLeft,
  Heart,
  Eye,
  Film,
  Users,
  Bookmark,
  CheckCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

export default function PublicUserProfile() {
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const params = useParams();
  const userId = params?.userId as string;
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  const [heroMovies, setHeroMovies] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'watchlist' | 'favorites' | 'watched'>('watchlist');
  const [isPrivate, setIsPrivate] = useState(false);

  useEffect(() => {
    if (!userId) {
      router.push('/');
      return;
    }

    if (userId === currentUser?.uid) {
      router.push('/user/profile');
      return;
    }

    loadProfile();
  }, [userId, currentUser, router]);

  const loadProfile = async () => {
    if (!userId || !currentUser) return;

    try {
      setLoading(true);
      
      // Load profile data from Firestore
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        toast({
          title: "Error",
          description: "User not found",
          variant: "destructive",
        });
        router.push('/user/following');
        return;
      }

      const data = userDoc.data();
      
      // Check if profile is private
      const isProfilePrivate = data.privacy?.profileVisibility !== 'public';
      setIsPrivate(isProfilePrivate);

      setProfileData(data);

      // Fetch trending movies for hero background (fallback)
      fetchHeroMovies();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      });
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  // Fetch trending movies as fallback for hero background
  const fetchHeroMovies = async () => {
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/trending/movie/day?language=en-US`,
        {
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_TMDB_API_READ_ACCESS_TOKEN}`,
          },
        }
      );
      const data = await response.json();
      setHeroMovies(data.results.slice(0, 12));
    } catch (error) {
      // Silently handle error
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!profileData) {
    return null;
  }

  const displayName = profileData.displayName || profileData.email?.split('@')[0] || profileData.username || 'User';
  const username = profileData.username || profileData.email?.split('@')[0] || 'user';
  const watchlistCount = isPrivate ? null : (profileData.watchlist?.length || 0);
  const favoritesCount = isPrivate ? null : (profileData.favorites?.length || 0);
  const watchedCount = isPrivate ? null : (profileData.watched?.length || 0);

  // Get content for active tab
  const getActiveTabContent = () => {
    if (isPrivate) return [];
    switch (activeTab) {
      case 'watchlist':
        return profileData.watchlist || [];
      case 'favorites':
        return profileData.favorites || [];
      case 'watched':
        return profileData.watched || [];
      default:
        return [];
    }
  };

  const activeContent = getActiveTabContent();

  // Get movies for hero background - use user's content + fill with trending for social media look
  const getHeroMovies = () => {
    const userItems = [
      ...(profileData?.watchlist || []),
      ...(profileData?.favorites || []),
      ...(profileData?.watched || []),
      ...(profileData?.wantToWatch || [])
    ].filter((item, index, self) => 
      item?.poster_path && self.findIndex(i => i.id === item.id) === index
    );

    // Fill with trending movies to create a rich social media look
    // User can customize later, but for now show a full grid
    const neededCount = Math.max(12, userItems.length);
    const trendingToAdd = heroMovies.filter(movie => 
      !userItems.some(item => item.id === movie.id)
    ).slice(0, neededCount - userItems.length);

    return [...userItems, ...trendingToAdd].slice(0, 12);
  };

  const displayHeroMovies = getHeroMovies();
  const hasUserContent = displayHeroMovies.length > 0;

  return (
    <div className="min-h-screen pb-12 bg-black">
      {/* Floating Back Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => router.back()}
        className="fixed top-24 left-4 z-50 text-white hover:bg-white/10 bg-black/40 backdrop-blur-sm rounded-full"
      >
        <ArrowLeft className="w-5 h-5" />
      </Button>

      {/* Hero Section with Movie Grid Background */}
      <div className="relative min-h-[45vh] max-h-[50vh] overflow-hidden flex flex-col justify-end -mt-24 pt-24 mb-4">
        {/* Background Grid - User's Content + Trending Movies */}
        {hasUserContent ? (
          <div className="absolute inset-0 -top-24 opacity-40 overflow-hidden">
            <div className="grid grid-cols-6 gap-2 h-full p-4 pt-28 overflow-hidden">
              {displayHeroMovies.slice(0, 12).map((item, index) => (
                <div 
                  key={item.id || index} 
                  className="relative aspect-[2/3] bg-gray-900 overflow-hidden rounded-lg max-h-full"
                >
                  {item.poster_path && (
                    <Image
                      src={`https://image.tmdb.org/t/p/w342${item.poster_path}`}
                      alt={item.title || item.name || ''}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 -top-24 bg-gradient-to-br from-indigo-900/20 via-purple-900/20 to-indigo-900/20" />
        )}

        {/* Lighter gradient overlay - less dark for better visibility */}
        <div className="absolute inset-0 -top-24 bg-gradient-to-b from-black/10 via-black/50 to-black/90" />
        <div className="absolute bottom-0 left-0 right-0 h-80 bg-gradient-to-t from-black/95 via-black/80 to-transparent" />

        {/* Profile Header Content - Instagram Style */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 px-4 pb-6 pt-20 max-w-4xl mx-auto w-full overflow-hidden"
        >
          <div className="flex flex-col gap-4 w-full">
            {/* Top Row: Profile Picture and Stats */}
            <div className="flex items-center gap-6 md:gap-8 w-full">
              {/* Avatar */}
              <Avatar className="w-24 h-24 md:w-28 md:h-28 border-2 border-white/20 shadow-2xl flex-shrink-0">
                <AvatarImage 
                  src={getAvatarPath(profileData.avatarId)} 
                  alt={displayName}
                  className="object-cover"
                />
                <AvatarFallback className="bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-300 text-3xl md:text-4xl font-bold">
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              {/* Stats Row */}
              <div className="flex items-center gap-6 md:gap-8 flex-1 justify-start md:justify-start">
                <div className="flex flex-col items-center">
                  <span className="text-white font-semibold text-base md:text-lg">
                    {isPrivate ? '—' : watchlistCount}
                  </span>
                  <span className="text-gray-400 text-xs md:text-sm">watchlist</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-white font-semibold text-base md:text-lg">
                    {isPrivate ? '—' : favoritesCount}
                  </span>
                  <span className="text-gray-400 text-xs md:text-sm">favorites</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-white font-semibold text-base md:text-lg">
                    {isPrivate ? '—' : watchedCount}
                  </span>
                  <span className="text-gray-400 text-xs md:text-sm">watched</span>
                </div>
              </div>
            </div>

            {/* Username with @ - Left Aligned */}
            <div className="w-full">
              <div className="flex items-center gap-2">
                <h1 className="text-base md:text-lg font-semibold">
                  <span className="text-indigo-500">@</span>
                  <span className="text-gray-400">{username.charAt(0).toLowerCase() + username.slice(1)}</span>
                </h1>
                {/* Verification Badge - Instagram Style */}
                {profileData.verified && (
                  <div className="w-4 h-4 md:w-5 md:h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                    <CheckCheck className="w-2.5 h-2.5 md:w-3 md:h-3 text-white" />
                  </div>
                )}
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex-1 min-w-0 w-full">

              {/* Bio */}
              <div className="mb-4">
                <p className="text-white text-sm md:text-base leading-relaxed">
                  {profileData.bio || "Movie enthusiast | Always looking for the next great film to watch | Share your recommendations!"}
                </p>
              </div>

            </div>
          </div>
        </motion.div>
      </div>

      <div className="max-w-4xl mx-auto px-4">
        {/* Tabs - Social Media Style - Left Aligned */}
        <div className="border-t border-white/10">
          <div className="flex items-center justify-start gap-8 md:gap-12">
            <button
              onClick={() => setActiveTab('watchlist')}
              className={cn(
                "flex items-center gap-2 py-4 px-2 border-t-2 transition-colors",
                activeTab === 'watchlist'
                  ? "border-white text-white"
                  : "border-transparent text-gray-400 hover:text-white"
              )}
            >
              <Bookmark className="w-4 h-4" />
              <span className="text-sm font-medium">Watchlist</span>
            </button>
            <button
              onClick={() => setActiveTab('favorites')}
              className={cn(
                "flex items-center gap-2 py-4 px-2 border-t-2 transition-colors",
                activeTab === 'favorites'
                  ? "border-white text-white"
                  : "border-transparent text-gray-400 hover:text-white"
              )}
            >
              <Heart className="w-4 h-4" />
              <span className="text-sm font-medium">Favorites</span>
            </button>
            <button
              onClick={() => setActiveTab('watched')}
              className={cn(
                "flex items-center gap-2 py-4 px-2 border-t-2 transition-colors",
                activeTab === 'watched'
                  ? "border-white text-white"
                  : "border-transparent text-gray-400 hover:text-white"
              )}
            >
              <Eye className="w-4 h-4" />
              <span className="text-sm font-medium">Watched</span>
            </button>
          </div>
        </div>

        {/* Content Grid - Social Media Style */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="py-8"
        >
          {isPrivate ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-gray-600" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                This profile is private
              </h3>
              <p className="text-gray-400 text-sm">
                This user has chosen to keep their profile private. Follow them to see their content.
              </p>
            </div>
          ) : activeContent.length > 0 ? (
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
              {activeContent.map((item: any, index: number) => (
                <div
                  key={item.id || index}
                  onClick={() => {
                    // Navigate directly to movie/TV show page
                    const mediaType = item.media_type || 'movie';
                    if (mediaType === 'tv') {
                      router.push(`/tv-shows/${item.id}`);
                    } else if (mediaType === 'anime') {
                      router.push(`/anime/${item.id}`);
                    } else {
                      router.push(`/movies/${item.id}`);
                    }
                  }}
                  className="cursor-pointer group"
                >
                  <div className="relative aspect-[2/3] bg-gray-900 overflow-hidden rounded-xl mb-2">
                    {item.poster_path ? (
                      <Image
                        src={`https://image.tmdb.org/t/p/w342${item.poster_path}`}
                        alt={item.title || item.name || ''}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                        <Film className="w-8 h-8 text-gray-600" />
                      </div>
                    )}
                  {/* Hover overlay - Top Left Corner */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300">
                    <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center gap-2">
                      <Heart className="w-5 h-5 text-white fill-white" />
                      <span className="text-white font-semibold text-sm">
                        {item.vote_average ? item.vote_average.toFixed(1) : 'N/A'}
                      </span>
                    </div>
                  </div>
                  </div>
                  {/* Title below poster - Left Aligned */}
                  <p className="text-white text-xs md:text-sm font-medium truncate text-left group-hover:text-indigo-400 transition-colors">
                    {item.title || item.name || 'Untitled'}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                {activeTab === 'watchlist' && <Bookmark className="w-8 h-8 text-gray-600" />}
                {activeTab === 'favorites' && <Heart className="w-8 h-8 text-gray-600" />}
                {activeTab === 'watched' && <Eye className="w-8 h-8 text-gray-600" />}
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                No {activeTab} yet
              </h3>
              <p className="text-gray-400 text-sm">
                This user hasn't added anything to their {activeTab} yet.
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

