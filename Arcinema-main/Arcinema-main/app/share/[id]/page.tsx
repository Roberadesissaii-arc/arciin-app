"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { 
  Star, 
  Calendar, 
  Clock,
  Play,
  Copy,
  Check,
  Tv,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { decodeShareId } from "@/lib/utils/shareUtils";
import { useTrailer } from "@/hooks/useTrailer";
import TrailerModal from "@/components/ui/trailer-modal";

interface MediaData {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  runtime?: number;
  number_of_seasons?: number;
  number_of_episodes?: number;
  genres: { id: number; name: string }[];
  tagline: string;
  status?: string;
  type: 'movie' | 'tv';
}

interface RecommendedMedia {
  id: number;
  title?: string;
  name?: string;
  poster_path: string;
  vote_average: number;
  media_type?: string;
}

export default function SharePage() {
  const params = useParams();
  const router = useRouter();
  const shareId = params.id as string;
  const [media, setMedia] = useState<MediaData | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendedMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const trailer = useTrailer();

  useEffect(() => {
    const fetchMedia = async () => {
      try {
        const decoded = decodeShareId(shareId);
        
        if (!decoded) {
          toast({
            title: "Invalid Share Link",
            description: "This share link is not valid",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        const { type, id } = decoded;
        const endpoint = type === 'movie' ? 'movie' : 'tv';
        const response = await fetch(
          `https://api.themoviedb.org/3/${endpoint}/${id}?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}`
        );
        const data = await response.json();
        
        setMedia({ ...data, type });
        
        // Fetch recommendations
        const recEndpoint = type === 'movie' ? 'movie' : 'tv';
        const recResponse = await fetch(
          `https://api.themoviedb.org/3/${recEndpoint}/${id}/recommendations?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}`
        );
        const recData = await recResponse.json();
        setRecommendations(recData.results?.slice(0, 6) || []);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load content details",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMedia();
  }, [shareId]);

  const handleCopyLink = async () => {
    const shareUrl = window.location.href;
    
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      
      setCopied(true);
      toast({
        description: "Link copied to clipboard!",
        className: "bg-black/40 backdrop-blur-xl border-white/20 text-white"
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        description: "Failed to copy link",
        variant: "destructive"
      });
    }
  };

  const handleViewFullDetails = () => {
    if (!media) return;
    const route = media.type === 'movie' ? `/movies/${media.id}` : `/tv-shows/${media.id}`;
    router.push(route);
  };

  const handleRecommendationClick = () => {
    toast({
      description: "Sign in to view this content",
      className: "bg-black/40 backdrop-blur-xl border-white/20 text-white"
    });
    setTimeout(() => {
      router.push('/auth/login');
    }, 1000);
  };

  const handlePlayTrailer = async (e: React.MouseEvent, item: RecommendedMedia) => {
    e.stopPropagation(); // Prevent triggering handleRecommendationClick
    const mediaType = media?.type || 'movie';
    const title = item.title || item.name || 'Unknown';
    await trailer.fetchTrailer(item.id, title, mediaType);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!media) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-white">Content not found</h1>
          <Button 
            onClick={() => router.push('/')}
            className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800"
          >
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  const displayTitle = media.title || media.name || "Unknown";
  const releaseDate = media.release_date || media.first_air_date;

  return (
    <div className="min-h-screen bg-black text-white pb-0">
      {/* Hide mobile navigation on this page */}
      <style jsx global>{`
        @media (max-width: 768px) {
          nav[class*="MobileBottomNav"],
          div[class*="mobile-nav"],
          div[class*="bottom-nav"],
          .mobile-bottom-navigation {
            display: none !important;
          }
        }
      `}</style>
      
      {/* Background Backdrop */}
      <div className="fixed inset-0">
        {media.backdrop_path && (
          <>
            <Image
              src={`https://image.tmdb.org/t/p/original${media.backdrop_path}`}
              alt={displayTitle}
              fill
              className="object-cover opacity-10"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black via-black/95 to-black" />
          </>
        )}
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Main Content */}
        <div className="container mx-auto px-4 py-12 max-w-7xl">
          <div className="grid lg:grid-cols-5 gap-8 lg:gap-12">
            {/* Left: Poster + Buttons */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-2 space-y-6"
            >
              {/* Poster */}
              <div className="relative aspect-[2/3] rounded-2xl overflow-hidden border border-white/10 shadow-2xl group">
                {media.poster_path ? (
                  <>
                    <Image
                      src={`https://image.tmdb.org/t/p/w500${media.poster_path}`}
                      alt={displayTitle}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      priority
                    />
                    {/* Gradient overlay - always visible */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    
                    {/* Play button - ALWAYS VISIBLE, zooms on hover */}
                    <div 
                      className="absolute inset-0 flex items-center justify-center z-10 cursor-pointer"
                      onClick={() => trailer.fetchTrailer(media.id, displayTitle, media.type)}
                    >
                      <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-md border-2 border-white/40 flex items-center justify-center transform transition-all duration-300 group-hover:scale-125 group-hover:bg-white/30 group-hover:border-white/60 shadow-2xl">
                        <Play className="w-10 h-10 text-white fill-white ml-1 drop-shadow-lg" />
                      </div>
                    </div>

                    {/* Bottom label */}
                    <div className="absolute bottom-4 inset-x-0 px-4 flex justify-center">
                      <div className="px-6 py-2 rounded-full bg-white/20 backdrop-blur-md border border-white/40 shadow-lg">
                        <p className="text-white text-sm font-medium">Watch Trailer</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full bg-white/5 flex items-center justify-center">
                    <span className="text-white/40">No Image</span>
                  </div>
                )}
              </div>

              {/* Buttons under poster */}
              <div className="space-y-3">
                <Button
                  onClick={() => router.push('/auth/login')}
                  size="lg"
                  className="w-full relative overflow-hidden bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:via-indigo-400 hover:to-indigo-500 text-white font-medium before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent px-6 md:px-8 py-3 text-base h-auto rounded-2xl shadow-lg"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <Play className="w-5 h-5 fill-white" />
                    Sign In to Add to Watchlist
                  </span>
                </Button>
              </div>
            </motion.div>

            {/* Right: Details */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="lg:col-span-3 space-y-6"
            >
              {/* Title */}
              <div>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-2 leading-tight">
                  {displayTitle}
                </h2>
                {media.tagline && (
                  <p className="text-white/50 italic text-base md:text-lg">
                    &ldquo;{media.tagline}&rdquo;
                  </p>
                )}
              </div>

              {/* Meta Info */}
              <div className="flex flex-wrap gap-3">
                {/* Rating */}
                <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full backdrop-blur-sm">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="font-semibold text-white text-sm">
                    {media.vote_average.toFixed(1)}
                  </span>
                </div>

                {/* Year */}
                {releaseDate && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full backdrop-blur-sm">
                    <Calendar className="w-4 h-4 text-white/60" />
                    <span className="text-white/80 text-sm">
                      {new Date(releaseDate).getFullYear()}
                    </span>
                  </div>
                )}

                {/* Runtime or Seasons */}
                {media.type === 'movie' && media.runtime ? (
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full backdrop-blur-sm">
                    <Clock className="w-4 h-4 text-white/60" />
                    <span className="text-white/80 text-sm">{media.runtime} min</span>
                  </div>
                ) : media.type === 'tv' && media.number_of_seasons ? (
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full backdrop-blur-sm">
                    <Tv className="w-4 h-4 text-white/60" />
                    <span className="text-white/80 text-sm">
                      {media.number_of_seasons}S • {media.number_of_episodes}E
                    </span>
                  </div>
                ) : null}
              </div>

              {/* Genres */}
              {media.genres && media.genres.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {media.genres.slice(0, 5).map((genre) => (
                    <Badge
                      key={genre.id}
                      variant="outline"
                      className="bg-white/5 border-white/10 text-white/90 hover:bg-white/10 px-3 py-1 text-xs"
                    >
                      {genre.name}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Overview */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white/90">Overview</h3>
                <p className="text-white/60 leading-relaxed text-sm md:text-base">
                  {media.overview || "No overview available."}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-4 pt-4">
                {/* View Details Button */}
                <Button
                  onClick={handleViewFullDetails}
                  size="lg"
                  className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white shadow-lg shadow-indigo-500/20 transition-all duration-300 hover:scale-[1.02] text-base font-semibold h-12"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  View Full Details
                </Button>

                {/* Copy Link Button */}
                <Button
                  onClick={handleCopyLink}
                  size="lg"
                  variant="outline"
                  className="w-full bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20 text-white backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] text-base h-12"
                >
                  <AnimatePresence mode="wait">
                    {copied ? (
                      <motion.div
                        key="check"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="flex items-center gap-2"
                      >
                        <Check className="w-5 h-5" />
                        <span>Link Copied!</span>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="copy"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="flex items-center gap-2"
                      >
                        <Copy className="w-5 h-5" />
                        <span>Copy Share Link</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Button>

                {/* Info Text */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
                  <p className="text-white/70 text-center text-sm">
                    Sign in to add to watchlist, like, and enjoy unlimited content
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Recommendations Section */}
        {recommendations.length > 0 && (
          <div className="container mx-auto px-4 pb-12 max-w-7xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-white">You May Also Like</h3>
                <p className="text-sm text-white/60">Sign in to watch</p>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {recommendations.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.2 }}
                    onClick={handleRecommendationClick}
                    className="cursor-pointer group"
                  >
                    <div className="relative aspect-[2/3] rounded-lg overflow-hidden border border-white/10 bg-white/5">
                      {item.poster_path ? (
                        <>
                          <Image
                            src={`https://image.tmdb.org/t/p/w300${item.poster_path}`}
                            alt={item.title || item.name || 'Recommended'}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-110"
                          />
                          {/* Gradient overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          
                          {/* Play button overlay */}
                          <div 
                            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"
                            onClick={(e) => handlePlayTrailer(e, item)}
                          >
                            <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center transform transition-transform duration-300 hover:scale-125 hover:bg-white/20">
                              <Play className="w-6 h-6 text-white fill-white ml-0.5" />
                            </div>
                          </div>
                          
                          {/* Title and rating */}
                          <div className="absolute inset-x-0 bottom-0 p-3 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                            <p className="text-white text-xs font-semibold line-clamp-2 mb-1">
                              {item.title || item.name}
                            </p>
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                              <span className="text-xs text-white/90">{item.vote_average.toFixed(1)}</span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-white/40 text-xs">No Image</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="pb-8 text-center"
        >
          <p className="text-white/40 text-xs">
            Enjoy unlimited movies and TV shows
          </p>
        </motion.div>
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
