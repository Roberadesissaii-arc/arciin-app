// components/anime/AnimeCard.tsx
"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useListActions } from "@/hooks/useListActions";
import { useActivityTracking } from "@/hooks/useActivityTracking";
import {
  Heart,
  Plus,
  Check,
  Play,
  Monitor,
  FolderPlus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { SavedMedia, CustomCollection } from "@/types/user";
import { cn } from "@/lib/utils";
import TrailerModal from "@/components/ui/trailer-modal";
import StarRating from "@/components/movies/ui/StarRating";
import AddToFolderDialog from "@/components/user/folders/AddToFolderDialog";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { projectFirestore } from "@/firebase/config";
import { useCollaborativeFolders } from "@/hooks/useCollaborativeFolders";

interface AnimeCardProps {
  anime: {
    id: number;
    title: string;
    name: string;
    poster_path: string;
    backdrop_path: string;
    vote_average: number;
    release_date: string;
    first_air_date: string;
    overview: string;
    genre_ids: number[];
    media_type: 'anime';
    episodes: number | null;
    status: string;
    rating: string;
    type: string;
    source: string;
    studios: any[];
    duration: string;
    mal_id: number;
    mal_url: string;
    trailer_url: string | null;
  };
  viewMode?: 'grid' | 'list';
  showActions?: boolean;
}

export default function AnimeCard({
  anime,
  viewMode = 'grid',
  showActions = true
}: AnimeCardProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { addToList, removeFromList, isInList } = useListActions();
  const { trackListAction, trackMediaView } = useActivityTracking();
  const { collaborativeFolders } = useCollaborativeFolders();
  const [isLoading, setIsLoading] = useState(false);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [isInFavorites, setIsInFavorites] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [showAddToFolderDialog, setShowAddToFolderDialog] = useState(false);
  const [userFolders, setUserFolders] = useState<CustomCollection[]>([]);
  const [isInAnyFolder, setIsInAnyFolder] = useState(false);

  // Check if item is in lists when component mounts or user changes
  useEffect(() => {
    const checkListStatus = async () => {
      if (!user) {
        setIsInWatchlist(false);
        setIsInFavorites(false);
        return;
      }

      try {
        const [watchlistStatus, favoritesStatus] = await Promise.all([
          isInList(user.uid, 'watchlist', anime.mal_id),
          isInList(user.uid, 'favorites', anime.mal_id)
        ]);
        
        setIsInWatchlist(watchlistStatus);
        setIsInFavorites(favoritesStatus);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
        }
      }
    };

    checkListStatus();
  }, [user, anime.mal_id, isInList]);

  // Fetch user folders
  useEffect(() => {
    const fetchUserFolders = async () => {
      if (!user) return;
      
      try {
        const userDocRef = doc(projectFirestore, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const personalCollections = userData.customCollections || [];
          
          // Merge personal folders (excluding collaborative ones) with collaborative folders
          const allFolders = [
            ...personalCollections.filter((f: CustomCollection) => !f.isCollaborative),
            ...collaborativeFolders
          ];
          
          setUserFolders(allFolders);
          
          // Check if anime is in any folder
          const inFolder = allFolders.some((folder: CustomCollection) =>
            folder.items.some((item: SavedMedia) => 
              item.id === anime.mal_id && item.media_type === 'anime'
            )
          );
          setIsInAnyFolder(inFolder);
        }
      } catch (error) {
        // Silent error handling
      }
    };

    fetchUserFolders();
  }, [user, anime.mal_id, collaborativeFolders]);

  const handleAction = async (action: string) => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    setIsLoading(true);
    try {
      // Convert anime to SavedMedia format
      const mediaItem: SavedMedia = {
        id: anime.mal_id,
        title: anime.title,
        poster_path: anime.poster_path,
        media_type: 'anime',
        overview: anime.overview,
        vote_average: anime.vote_average,
        release_date: anime.release_date || anime.first_air_date,
        first_air_date: anime.first_air_date || anime.release_date,
        addedAt: new Date().toISOString()
      };

      switch (action) {
        case 'watchlist':
          if (isInWatchlist) {
            await removeFromList(user.uid, 'watchlist', anime.mal_id);
            setIsInWatchlist(false);
            toast({
              title: "Removed from watchlist",
              description: `${anime.title} has been removed from your watchlist`,
            });
          } else {
            await addToList(user.uid, 'watchlist', mediaItem);
            setIsInWatchlist(true);
            trackListAction(anime.mal_id, anime.title, 'anime', 'watchlist');
            toast({
              title: "Added to watchlist",
              description: `${anime.title} has been added to your watchlist`,
            });
          }
          break;
          
        case 'favorites':
          if (isInFavorites) {
            await removeFromList(user.uid, 'favorites', anime.mal_id);
            setIsInFavorites(false);
            toast({
              title: "Removed from favorites",
              description: `${anime.title} has been removed from your favorites`,
            });
          } else {
            await addToList(user.uid, 'favorites', mediaItem);
            setIsInFavorites(true);
            trackListAction(anime.mal_id, anime.title, 'anime', 'favorites');
            toast({
              title: "Added to favorites",
              description: `${anime.title} has been added to your favorites`,
            });
          }
          break;

        default:
          break;
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
      }
      toast({
        title: "Error",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToFolder = async (folderId: string) => {
    if (!user) return;

    try {
      // Convert anime to SavedMedia format
      const mediaItem: SavedMedia = {
        id: anime.mal_id,
        title: anime.title,
        poster_path: anime.poster_path,
        media_type: 'anime',
        overview: anime.overview,
        vote_average: anime.vote_average,
        release_date: anime.release_date || anime.first_air_date,
        first_air_date: anime.first_air_date || anime.release_date,
        addedAt: new Date().toISOString()
      };
      
      // Check if it's a collaborative folder first
      const collabFolder = collaborativeFolders.find(f => f.id === folderId);
      
      if (collabFolder) {
        // Handle collaborative folder
        const itemExists = collabFolder.items.some(
          (item: SavedMedia) => item.id === anime.mal_id && item.media_type === 'anime'
        );
        
        if (itemExists) {
          toast({
            title: "Already added",
            description: `${anime.title} is already in this folder`,
          });
          return;
        }
        
        const { addItemToCollaborativeFolder } = await import('@/lib/firebase/collaborativeFolders');
        const result = await addItemToCollaborativeFolder(folderId, mediaItem, user.uid);
        
        if (result.success) {
          toast({
            title: "Added to collaborative folder",
            description: `${anime.title} will appear for all collaborators`,
          });
          
          // Refetch to update UI
          const userDocRef = doc(projectFirestore, 'users', user.uid);
          const updatedUserDoc = await getDoc(userDocRef);
          if (updatedUserDoc.exists()) {
            const personalCollections = updatedUserDoc.data().customCollections || [];
            const allFolders = [
              ...personalCollections.filter((f: CustomCollection) => !f.isCollaborative),
              ...collaborativeFolders
            ];
            setUserFolders(allFolders);
            setIsInAnyFolder(true);
          }
        } else {
          toast({
            title: "Error",
            description: result.message,
            variant: "destructive"
          });
        }
        return;
      }
      
      // Handle regular personal folder
      const userDocRef = doc(projectFirestore, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const collections = userData.customCollections || [];
        
        // Find the folder and add the anime
        const updatedCollections = collections.map((folder: CustomCollection) => {
          if (folder.id === folderId) {
            // Check if anime already exists
            const exists = folder.items.some(
              item => item.id === anime.mal_id && item.media_type === 'anime'
            );
            
            if (!exists) {
              return {
                ...folder,
                items: [...folder.items, mediaItem]
              };
            }
          }
          return folder;
        });

        await updateDoc(userDocRef, {
          customCollections: updatedCollections
        });

        // Update local state - merge with collaborative folders
        const personalCollections = updatedCollections.filter((f: CustomCollection) => !f.isCollaborative);
        const allFolders = [
          ...personalCollections,
          ...collaborativeFolders
        ];
        setUserFolders(allFolders);
        setIsInAnyFolder(true);

        toast({
          title: "Added to folder",
          description: `${anime.title} has been added to the folder`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add to folder",
        variant: "destructive"
      });
    }
  };

  const handleClick = () => {
    trackMediaView(anime.mal_id, anime.title, 'anime');
    router.push(`/anime/${anime.mal_id}`);
  };

  const formatScore = (score: number) => {
    return score > 0 ? score.toFixed(1) : 'N/A';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Currently Airing':
        return 'bg-green-500/20 text-green-500';
      case 'Finished Airing':
        return 'bg-blue-500/20 text-blue-500';
      case 'Not yet aired':
        return 'bg-yellow-500/20 text-yellow-500';
      default:
        return 'bg-gray-500/20 text-gray-500';
    }
  };

  if (viewMode === 'list') {
    return (
      <motion.div
        layout
        className="group relative bg-black/20 rounded-lg overflow-hidden hover:bg-black/40 transition-colors"
      >
        <div className="flex items-center gap-4 p-4">
          {/* Poster */}
          <div className="relative h-[150px] w-[100px] shrink-0">
            <Image
              src={anime.poster_path}
              alt={anime.title}
              fill
              className="rounded object-cover"
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold line-clamp-2 h-10 sm:h-12 flex items-start leading-tight text-sm sm:text-base">
              {anime.title}
            </h3>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-400 mt-1">
              <Badge className={getStatusColor(anime.status)}>
                {anime.status}
              </Badge>
              <span>{anime.type}</span>
              {anime.episodes && <span>• {anime.episodes} episodes</span>}
            </div>
            <p className="text-xs sm:text-sm text-gray-400 line-clamp-2 mt-2">
              {anime.overview}
            </p>
          </div>

          {/* Actions */}
          {showActions && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleAction('favorites')}
                disabled={isLoading}
              >
                <Heart className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      className="group relative aspect-[2/3] rounded-xl overflow-hidden cursor-pointer w-full shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:z-10"
      onClick={handleClick}
    >
      {/* Trailer Modal */}
      <TrailerModal
        isOpen={showTrailer}
        onClose={() => setShowTrailer(false)}
        trailerUrl={anime.trailer_url}
        title={anime.title}
      />

      {/* Poster */}
      <Image
        src={anime.poster_path}
        alt={anime.title}
        fill
        className="object-cover transition-transform duration-300"
      />

      {/* Rating at top left */}
      <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
        <StarRating rating={anime.vote_average} showAsNumber={true} />
      </div>

      {/* Status indicators at top right */}
      <div className="absolute top-3 right-3 flex flex-col gap-1">
        {/* Type badge */}
        <Badge className="bg-indigo-500/90 backdrop-blur-sm text-white text-xs px-2 py-0.5">
          {anime.type}
        </Badge>
        {isInFavorites && (
          <div className="bg-indigo-500/90 backdrop-blur-sm rounded-full p-1.5">
            <Heart className="w-3 h-3 text-white fill-white" />
          </div>
        )}
        {isInWatchlist && (
          <div className="bg-blue-500/90 backdrop-blur-sm rounded-full p-1.5">
            <Check className="w-3 h-3 text-white" />
          </div>
        )}
      </div>

      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300">
        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="font-bold text-white mb-2 line-clamp-2 text-sm leading-tight">
            {anime.title}
          </h3>
          <p className="text-gray-300 text-xs mb-4">
            {anime.episodes ? `${anime.episodes} episodes` : anime.status}
          </p>

          {/* Action Buttons */}
          {showActions && (
            <div className="flex flex-wrap items-center gap-2 w-full">
              {anime.trailer_url ? (
                <Button
                  size="sm"
                  className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:via-indigo-400 hover:to-indigo-500 text-white font-semibold flex-1 min-w-[100px] h-9 rounded-lg
                           before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowTrailer(true);
                  }}
                >
                  <Play className="w-4 h-4 mr-1 relative z-10" />
                  <span className="relative z-10 text-xs">Trailer</span>
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:via-indigo-400 hover:to-indigo-500 text-white font-semibold flex-1 min-w-[100px] h-9 rounded-lg
                           before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(anime.mal_url, '_blank');
                  }}
                >
                  <Monitor className="w-4 h-4 mr-1 relative z-10" />
                  <span className="relative z-10 text-xs">View on MAL</span>
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className={`h-9 w-9 rounded-lg transition-all ${
                  isInFavorites 
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                    : 'bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAction('favorites');
                }}
                disabled={isLoading}
                title="Like"
              >
                <Heart className={`w-4 h-4 ${isInFavorites ? 'fill-white' : ''}`} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={`h-9 w-9 rounded-lg transition-all backdrop-blur-sm ${
                  isInAnyFolder
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    : 'bg-white/20 hover:bg-white/30 text-white'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAddToFolderDialog(true);
                }}
                disabled={isLoading}
                title="Add to Folder"
              >
                <FolderPlus className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Add to Folder Dialog */}
      <AddToFolderDialog
        open={showAddToFolderDialog}
        onOpenChange={setShowAddToFolderDialog}
        media={{
          id: anime.mal_id,
          title: anime.title,
          poster_path: anime.poster_path,
          media_type: 'anime',
          overview: anime.overview,
          vote_average: anime.vote_average,
          release_date: anime.release_date || anime.first_air_date,
          first_air_date: anime.first_air_date || anime.release_date,
          addedAt: new Date().toISOString()
        }}
        folders={userFolders}
        onAddToFolder={handleAddToFolder}
      />
    </motion.div>
  );
}