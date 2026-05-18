// components/sections/WelcomeSection.tsx
"use client";

import { useEffect, useState } from 'react';
import { motion } from "framer-motion";
import { 
  Sparkles, 
  Clock, 
  Calendar,
  Film,
  Star
} from "lucide-react";
import { User } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { projectFirestore } from '@/firebase/config';
import { cn } from "@/lib/utils";
import { getAvatarPath } from '@/lib/utils/profileAvatars';
import Image from 'next/image';

interface WelcomeSectionProps {
  user: User;
}

interface UserStats {
  watchlistCount: number;
  lastWatched: {
    title: string;
    addedAt: string;
  } | null;
  favoriteGenre: string;
}

interface SavedMedia {
  id: number;
  title: string;
  genres: Array<{ id: number; name: string }>;
  addedAt: string;
}

interface MovieDetails {
  genres: Array<{ id: number; name: string }>;
}

interface GenreCount {
  [key: string]: number;
}

const fetchMovieGenres = async (movieId: number): Promise<MovieDetails | null> => {
  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/movie/${movieId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_TMDB_API_READ_ACCESS_TOKEN}`,
        },
      }
    );
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    return null;
  }
};

export default function WelcomeSection({ user }: WelcomeSectionProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [avatarId, setAvatarId] = useState<string | undefined>();
  const [stats, setStats] = useState<UserStats>({
    watchlistCount: 0,
    lastWatched: null,
    favoriteGenre: 'Loading...'
  });
  const [loading, setLoading] = useState(true);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // Replace the old useEffect with the new real-time listener
  useEffect(() => {
    if (!user) return;

    const userRef = doc(projectFirestore, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, async (doc) => {
      if (doc.exists()) {
        try {
          setLoading(true);
          const userData = doc.data();
          
          // Set avatar ID
          setAvatarId(userData.avatarId);
          
          const watchlist = userData.watchlist || [];
          const watched = userData.watched || [];

          // Fetch full movie details including genres
          const moviesWithGenres = await Promise.all(
            watchlist.map(async (item: SavedMedia) => {
              try {
                const response = await fetch(
                  `https://api.themoviedb.org/3/movie/${item.id}`,
                  {
                    headers: {
                      Authorization: `Bearer ${process.env.NEXT_PUBLIC_TMDB_API_READ_ACCESS_TOKEN}`,
                    },
                  }
                );
                
                // Skip if movie doesn't exist
                if (!response.ok) {
                  return item;
                }
                
                const movieData = await response.json();
                return {
                  ...item,
                  genres: movieData.genres || []
                };
              } catch (error) {
                // Silently return item without genres if fetch fails
                return item;
              }
            })
          );

          // Count genres
          const genreCounts: { [key: string]: number } = {};
          moviesWithGenres.forEach(movie => {
            movie.genres?.forEach((genre: { id: number; name: string }) => {
              if (genre.name) {
                genreCounts[genre.name] = (genreCounts[genre.name] || 0) + 1;
              }
            });
          });

          // Find most frequent genre
          let maxCount = 0;
          let favoriteGenre = '';
          Object.entries(genreCounts).forEach(([genre, count]) => {
            if (count > maxCount) {
              maxCount = count;
              favoriteGenre = `${genre} • ${count} movies`;
            }
          });

          // Get latest watched item
          const lastWatched = watched.length > 0 
            ? watched.sort((a: SavedMedia, b: SavedMedia) => 
                new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
              )[0]
            : null;

          setStats({
            watchlistCount: watchlist.length,
            lastWatched: lastWatched ? {
              title: lastWatched.title,
              addedAt: lastWatched.addedAt
            } : null,
            favoriteGenre: favoriteGenre || 'Add movies to see favorite'
          });
        } catch (error) {
          setStats(prev => ({
            ...prev,
            favoriteGenre: 'Error loading genres'
          }));
        } finally {
          setLoading(false);
        }
      }
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, [user]);

  // Add the new renderFavoriteGenre function
  const renderFavoriteGenre = () => (
    <div className="text-base font-semibold mt-1 group-hover:text-pink-400/90 transition-colors pl-6">
      {loading ? (
        <div className="flex items-center gap-2">
          <div className="animate-spin h-4 w-4 border-2 border-pink-500/20 border-t-pink-500/60 rounded-full" />
          <span className="text-sm">Analyzing collection...</span>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-2"
        >
          <span className="text-base">
            {stats.favoriteGenre}
          </span>
        </motion.div>
      )}
    </div>
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="relative px-4 py-6 overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-black via-black/95 to-black" />
      
      <div className="relative">
        {/* Welcome Message & Time */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <motion.div 
            variants={itemVariants}
            className="space-y-1.5"
          >
            <div className="flex items-center gap-3">
              {/* User Avatar */}
              <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-indigo-500/30 shrink-0">
                <Image
                  src={getAvatarPath(avatarId)}
                  alt="Profile"
                  fill
                  className="object-cover"
                  sizes="48px"
                />
              </div>
              
              <div>
                <div className="flex items-center gap-2 text-indigo-400/90">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="text-sm font-medium">Welcome back</span>
                </div>
                
                <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                  {user.displayName 
                    ? user.displayName.charAt(0).toUpperCase() + user.displayName.slice(1)
                    : 'Movie Fan'}
                  <span className="text-xl animate-float">👋</span>
                </h2>
              </div>
            </div>
            
            <p className="text-sm text-gray-400 pl-15">
              Ready to discover something new today?
            </p>
          </motion.div>

          <motion.div 
            variants={itemVariants}
            className="flex gap-3"
          >
            <div className="flex flex-col items-center px-4 py-2 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10 transition-colors hover:border-white/20">
              <Clock className="w-4 h-4 text-indigo-400/80 mb-1" />
              <span className="text-base font-medium">
                {currentTime.toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit'
                })}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-gray-500">Local Time</span>
            </div>

            <div className="flex flex-col items-center px-4 py-2 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10 transition-colors hover:border-white/20">
              <Calendar className="w-4 h-4 text-indigo-400/80 mb-1" />
              <span className="text-base font-medium">
                {currentTime.toLocaleDateString([], { 
                  month: 'short',
                  day: 'numeric'
                })}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-gray-500">Today</span>
            </div>
          </motion.div>
        </div>

        {/* Stats Grid */}
        <motion.div 
          variants={itemVariants}
          className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5"
        >
          {/* Watchlist Count */}
          <div className="group px-5 py-3 rounded-lg bg-gradient-to-r from-indigo-500/5 to-purple-500/5 
                border border-indigo-500/10 transition-all duration-300
                hover:border-indigo-500/20 hover:from-indigo-500/10 hover:to-purple-500/10"
          >
            <div className="flex items-center gap-2">
              <Film className="w-4 h-4 text-indigo-400/80" />
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">In Watchlist</span>
            </div>
            <div className="text-base font-semibold mt-1 group-hover:text-indigo-400/90 transition-colors pl-6">
              {loading ? '...' : `${stats.watchlistCount} ${stats.watchlistCount === 1 ? 'Item' : 'Items'}`}
            </div>
          </div>

          {/* Last Watched */}
          <div className="group px-5 py-3 rounded-lg bg-gradient-to-r from-purple-500/5 to-pink-500/5 
                border border-purple-500/10 transition-all duration-300
                hover:border-purple-500/20 hover:from-purple-500/10 hover:to-pink-500/10"
          >
            <div className="flex items-center gap-2">
              <Film className="w-4 h-4 text-purple-400/80" />
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Last Added</span>
            </div>
            <div className="text-base font-semibold mt-1 group-hover:text-purple-400/90 transition-colors pl-6 line-clamp-1">
              {loading ? '...' : (stats.lastWatched?.title || 'No items yet')}
            </div>
          </div>

          {/* Favorite Genre */}
          <div className="group px-5 py-3 rounded-lg bg-gradient-to-r from-pink-500/5 to-red-500/5 
                border border-pink-500/10 transition-all duration-300
                hover:border-pink-500/20 hover:from-pink-500/10 hover:to-red-500/10"
          >
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-pink-400/80" />
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                Favorite Genre
              </span>
            </div>
            {renderFavoriteGenre()}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}