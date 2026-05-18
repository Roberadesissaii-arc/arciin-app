"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { 
  Play, 
  Heart, 
  Plus, 
  Eye, 
  FolderPlus, 
  Star,
  Calendar,
  TrendingUp
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { addToList, removeFromList } from "@/lib/firebase/userLists";
import { toast } from "@/components/ui/use-toast";
import MoviePlaceholder from "@/components/movies/cards/MoviePlaceholder";
import WatchProviderBadge from "@/components/ui/WatchProviderBadge";

interface SearchCardProps {
  id: number;
  title: string;
  posterPath?: string;
  overview?: string;
  releaseDate?: string;
  firstAirDate?: string;
  voteAverage?: number;
  mediaType: 'movie' | 'tv' | 'anime' | 'person';
  originCountry?: string[];
}

export default function SearchCard({
  id,
  title,
  posterPath,
  overview,
  releaseDate,
  firstAirDate,
  voteAverage,
  mediaType,
  originCountry
}: SearchCardProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [isHovered, setIsHovered] = useState(false);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [imageError, setImageError] = useState(false);

  const date = releaseDate || firstAirDate;
  const year = date ? new Date(date).getFullYear() : null;

  // Determine age rating based on vote average and media type
  const getAgeRating = () => {
    if (mediaType === 'anime') {
      // Anime ratings based on score/content
      if (voteAverage && voteAverage >= 8) return 'TV-14';
      return 'TV-PG';
    }
    // For movies and TV shows, use vote average as indicator
    if (voteAverage && voteAverage >= 7.5) return '18+';
    if (voteAverage && voteAverage >= 6) return 'PG-13';
    return 'PG';
  };

  const ageRating = getAgeRating();

  const handleClick = () => {
    if (mediaType === 'movie') {
      router.push(`/movies/${id}`);
    } else if (mediaType === 'tv') {
      router.push(`/tv-shows/${id}`);
    } else if (mediaType === 'anime') {
      router.push(`/anime/${id}`);
    } else if (mediaType === 'person') {
      router.push(`/person/${id}`);
    }
  };

  const handleAction = async (action: 'watchlist' | 'favorites', e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to manage your lists.",
        variant: "destructive",
      });
      return;
    }

    try {
      const mediaData = {
        id,
        title,
        name: title,
        poster_path: posterPath || '',
        media_type: (mediaType === 'anime' ? 'tv' : mediaType) as 'movie' | 'tv',
        overview,
        release_date: releaseDate,
        first_air_date: firstAirDate,
        vote_average: voteAverage || 0,
        addedAt: new Date().toISOString()
      };

      if (action === 'watchlist') {
        if (isInWatchlist) {
          await removeFromList(user.uid, action, id);
          setIsInWatchlist(false);
          toast({ title: "Removed from watchlist" });
        } else {
          await addToList(user.uid, action, mediaData);
          setIsInWatchlist(true);
          toast({ title: "Added to watchlist" });
        }
      } else {
        if (isLiked) {
          await removeFromList(user.uid, action, id);
          setIsLiked(false);
          toast({ title: "Removed from favorites" });
        } else {
          await addToList(user.uid, action, mediaData);
          setIsLiked(true);
          toast({ title: "Added to favorites" });
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update your list. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.03 }}
      transition={{ duration: 0.15 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={handleClick}
      className="group relative cursor-pointer h-full"
    >
      {/* Card Container with enhanced glass morphism */}
      <div className="relative bg-black/30 backdrop-blur-xl rounded-xl overflow-hidden border border-white/10 hover:border-purple-500/30 shadow-xl hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-300 h-full flex flex-col group-hover:bg-black/40">
        {/* Poster Section - Taller */}
        <div className="relative aspect-[2/3.2] overflow-hidden flex-shrink-0">
          {/* Gradient Overlay - Always visible for depth */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10 pointer-events-none" />
          
          {/* Poster Image */}
          {posterPath && !imageError ? (
            <Image
              src={posterPath.startsWith('http') ? posterPath : `https://image.tmdb.org/t/p/w500${posterPath}`}
              alt={title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-110"
              onError={() => setImageError(true)}
            />
          ) : (
            <MoviePlaceholder
              title={title}
              mediaType={mediaType}
              className="w-full h-full"
            />
          )}

          {/* Age Rating Badge - Top Left Corner */}
          <div className="absolute top-2 left-2 z-30 bg-black/90 backdrop-blur-xl px-2 py-1 rounded-md border border-white/20 shadow-lg">
            <span className="text-xs font-bold text-white">
              {ageRating}
            </span>
          </div>

          {/* Provider Badge - Top Left (below age rating) */}
          {mediaType !== 'person' && (
            <div className="absolute top-10 left-2 z-20">
              <WatchProviderBadge
                mediaId={id}
                mediaType={mediaType === 'anime' ? 'tv' : mediaType as 'movie' | 'tv'}
                size="small"
              />
            </div>
          )}

          {/* Rating Badge - Top Right */}
          {voteAverage && voteAverage > 0 && (
            <div className="absolute top-3 right-3 z-20 flex items-center gap-1 bg-black/70 backdrop-blur-xl px-2 py-1 rounded-lg border border-yellow-400/20 shadow-lg">
              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
              <span className="text-xs font-semibold text-white">
                {voteAverage.toFixed(1)}
              </span>
            </div>
          )}

          {/* Action Buttons Overlay - Centered on Hover (not for people) */}
          <AnimatePresence>
            {isHovered && mediaType !== 'person' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 z-20 flex items-center justify-center bg-black/70"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-2">
                  {/* Watchlist */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => handleAction('watchlist', e)}
                    className={`p-2.5 rounded-full backdrop-blur-md border transition-all ${
                      isInWatchlist
                        ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 border-indigo-400/50'
                        : 'bg-white/10 border-white/20 hover:bg-white/20'
                    }`}
                    title={isInWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
                  >
                    <Plus className={`w-4 h-4 text-white ${isInWatchlist ? 'rotate-45' : ''} transition-transform`} />
                  </motion.button>

                  {/* Favorites */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => handleAction('favorites', e)}
                    className={`p-2.5 rounded-full backdrop-blur-md border transition-all ${
                      isLiked
                        ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 border-indigo-400/50'
                        : 'bg-white/10 border-white/20 hover:bg-white/20'
                    }`}
                    title={isLiked ? 'Remove from Favorites' : 'Add to Favorites'}
                  >
                    <Heart className={`w-4 h-4 text-white ${isLiked ? 'fill-white' : ''}`} />
                  </motion.button>

                  {/* Folder */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      toast({ title: "Folder feature", description: "Coming soon!" });
                    }}
                    className="p-2.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 transition-all"
                    title="Add to Folder"
                  >
                    <FolderPlus className="w-4 h-4 text-white" />
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Info Section - Increased padding */}
        <div className="p-3 flex-1 flex flex-col justify-between">
          {/* Title */}
          <h3 className="text-white font-semibold text-sm line-clamp-2 mb-2">
            {title}
          </h3>

          {/* Bottom Info */}
          <div className="flex items-center justify-between text-xs text-gray-400 mt-auto">
            {year && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {year}
              </span>
            )}
            {originCountry && originCountry.length > 0 && (
              <span className="bg-white/10 px-2 py-0.5 rounded text-xs">
                {originCountry[0]}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
