"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, AlertTriangle, Loader2 } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { spoilerService } from "@/lib/features/media/spoilerService";
import SpoilerAudioPlayer from "@/components/spoilers/SpoilerAudioPlayer";
import DOMPurify from "dompurify";

// Format spoiler content with proper styling and sanitize to prevent XSS
function formatSpoilerContent(content: string): string {
  // First, escape any existing HTML to prevent XSS
  const escaped = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  
  // Then apply safe formatting
  const formatted = escaped
    // Quoted text (show titles) - Give them indigo color
    .replace(/"([^"]+)"/g, '<span class="font-bold text-indigo-400">"$1"</span>')
    // Bold section headers (** SECTION NAME **)
    .replace(/\*\*([A-Z][A-Z\s&]+)\*\*/g, '<span class="font-bold text-indigo-300 text-lg">$1</span>')
    // Regular bold text (** text **)
    .replace(/\*\*(.*?)\*\*/g, '<span class="font-bold text-white">$1</span>')
    // Numbered lists (1. 2. 3. etc.)
    .replace(/^(\d+\.\s)/gm, '<span class="font-bold text-indigo-400">$1</span>')
    // Section headers (ALL CAPS followed by colon)
    .replace(/^([A-Z][A-Z\s&]+:)/gm, '<span class="font-bold text-indigo-300 text-lg">$1</span>')
    // Convert line breaks to HTML
    .replace(/\n/g, '<br/>');
  
  // Sanitize the final HTML to prevent any XSS attacks
  return DOMPurify.sanitize(formatted, {
    ALLOWED_TAGS: ['span', 'br'],
    ALLOWED_ATTR: ['class'],
    ALLOW_DATA_ATTR: false
  });
}

interface TVShowDetails {
  id: number;
  name: string;
  overview: string;
  backdrop_path: string;
  poster_path: string;
  first_air_date: string;
  vote_average: number;
  genres: { id: number; name: string }[];
  number_of_seasons: number;
}

export default function TVShowSpoilersPage() {
  const params = useParams();
  const router = useRouter();
  const showId = params.id as string;
  
  const [show, setShow] = useState<TVShowDetails | null>(null);
  const [spoilers, setSpoilers] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [spoilersLoading, setSpoilersLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [cacheKey, setCacheKey] = useState<string>('');
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [backgroundAudioUrl, setBackgroundAudioUrl] = useState<string>('');

  // Check if spoilers should be available (show must have aired for at least 3 months)
  const isSpoilerAvailable = (airDate: string): boolean => {
    const firstAir = new Date(airDate);
    const now = new Date();
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    // Show must have aired (not in future) and at least 3 months old
    return firstAir <= now && firstAir <= threeMonthsAgo;
  };

  useEffect(() => {
    const fetchShow = async () => {
      try {
        const response = await fetch(
          `https://api.themoviedb.org/3/tv/${showId}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_TMDB_API_READ_ACCESS_TOKEN}`,
            },
          }
        );

        if (!response.ok) throw new Error("Failed to fetch TV show details");
        
        const data = await response.json();
        setShow(data);
        setLoading(false);
      } catch (err) {
        setError("Failed to load TV show details");
        setLoading(false);
      }
    };

    fetchShow();
  }, [showId]);

  const handleLoadSpoilers = async () => {
    if (!show) return;
    
    setSpoilersLoading(true);
    try {
      const result = await spoilerService.getTVShowSpoilers(show.name, undefined, show.id);
      
      if (result.success) {
        setSpoilers(result.spoilers);
        
        // Generate cache key and fetch cached audio if available
        const normalizedTitle = show.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
        const key = `spoilers-tv-${normalizedTitle}`;
        setCacheKey(key);
        
        // Try to get cached audio
        const cachedData = await spoilerService.getSpoilerWithAudio(key);
        if (cachedData?.audioUrl) {
          setAudioUrl(cachedData.audioUrl);
        }
        if (cachedData?.backgroundAudioUrl) {
          setBackgroundAudioUrl(cachedData.backgroundAudioUrl);
        }
      } else {
        setError(result.error || "Failed to load spoilers");
      }
    } catch (err) {
      setError("Failed to load spoilers");
    } finally {
      setSpoilersLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-white/80 mx-auto mb-4" />
          <p className="text-gray-400">Loading TV show details...</p>
        </div>
      </div>
    );
  }

  if (error && !show) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl text-white mb-2">Error Loading TV Show</h1>
          <p className="text-gray-400 mb-4">{error}</p>
          <Button 
            onClick={() => router.back()}
            className="bg-white/5 border border-white/10 text-white hover:bg-white/10"
          >
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (!show) return null;

  return (
    <div className="min-h-screen bg-black">
      {/* Hero Backdrop - Half page section */}
      {show.backdrop_path && (
        <div className="relative w-full h-[50vh] z-0">
          <Image
            src={`https://image.tmdb.org/t/p/original${show.backdrop_path}`}
            alt=""
            fill
            className="object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-black/50" />
        </div>
      )}

      {/* Header */}
      <div className="relative z-10 px-4 md:px-6 lg:px-8 -mt-[40vh] pt-2 md:pt-4 lg:pt-6">
        {/* Back Button - Mobile Only - Positioned above content */}
        <div className="md:hidden mb-2">
          <Button
            onClick={() => router.back()}
            variant="ghost"
            size="sm"
            className="bg-white/5 backdrop-blur-sm border border-white/10 text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>

        {/* Show Info */}
        <div className="max-w-4xl mx-auto">
          {/* Mobile Layout */}
          <div className="md:hidden flex flex-row gap-4">
            {/* Poster - Mobile */}
            {show.poster_path && (
              <div className="flex-shrink-0">
                <div className="w-28 h-42 rounded-lg overflow-hidden bg-white/5">
                  <Image
                    src={`https://image.tmdb.org/t/p/w500${show.poster_path}`}
                    alt={show.name}
                    width={112}
                    height={168}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            {/* Show Details - Mobile */}
            <div className="flex-1 text-left">
              <h1 className="text-xl font-bold text-white mb-2">
                {show.name}
              </h1>
              
              <div className="flex flex-wrap items-center gap-2 mb-3 text-xs text-gray-400">
                <span>{new Date(show.first_air_date).getFullYear()}</span>
                <span>•</span>
                <span>{show.vote_average.toFixed(1)} ★</span>
                <span>•</span>
                <span>{show.number_of_seasons} Season{show.number_of_seasons !== 1 ? 's' : ''}</span>
                {show.genres.length > 0 && (
                  <>
                    <span>•</span>
                    <span className="line-clamp-1">{show.genres.map(g => g.name).join(", ")}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Description - Full width */}
          <div className="md:hidden mt-4">
            <p className="text-gray-300 leading-relaxed text-sm">
              {show.overview}
            </p>
          </div>

          {/* Desktop Layout */}
          <div className="hidden md:flex flex-row gap-6">
            {/* Poster - Desktop */}
            {show.poster_path && (
              <div className="flex-shrink-0">
                <div className="w-48 h-72 rounded-lg overflow-hidden bg-white/5">
                  <Image
                    src={`https://image.tmdb.org/t/p/w500${show.poster_path}`}
                    alt={show.name}
                    width={192}
                    height={288}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}

            {/* Show Details - Desktop */}
            <div className="flex-1 text-left">
              <h1 className="text-3xl lg:text-4xl font-bold text-white mb-4">
                {show.name}
              </h1>
              
              <div className="flex flex-wrap items-center gap-3 mb-6 text-sm text-gray-400">
                <span>{new Date(show.first_air_date).getFullYear()}</span>
                <span>•</span>
                <span>{show.vote_average.toFixed(1)} ★</span>
                <span>•</span>
                <span>{show.number_of_seasons} Season{show.number_of_seasons !== 1 ? 's' : ''}</span>
                {show.genres.length > 0 && (
                  <>
                    <span>•</span>
                    <span>{show.genres.map(g => g.name).join(", ")}</span>
                  </>
                )}
              </div>

              {/* Desktop Description - In right column */}
              <p className="text-gray-300 leading-relaxed text-base">
                {show.overview}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Warning Section */}
      <div className="relative z-10 max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
        {isSpoilerAvailable(show.first_air_date) ? (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6 mb-8">
            <div className="mb-4">
              <div className="flex items-center gap-3 mb-3">
                <AlertTriangle className="w-6 h-6 text-orange-400 flex-shrink-0" />
                <h2 className="text-xl font-semibold text-white">
                  Spoiler Warning
                </h2>
              </div>
              <p className="text-gray-400">
                This section contains major plot details and spoilers for {show.name}. 
                Only continue if you want to know everything about the show's story.
              </p>
            </div>

            {!spoilers && (
              <Button
                onClick={handleLoadSpoilers}
                disabled={spoilersLoading}
                className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20"
              >
                {spoilersLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Preparing Spoilers...
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Reveal Spoilers
                  </>
                )}
              </Button>
            )}
          </div>
        ) : (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6 mb-8">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle className="w-6 h-6 text-blue-400 flex-shrink-0" />
              <h2 className="text-xl font-semibold text-white">
                Spoilers Not Available Yet
              </h2>
            </div>
            <p className="text-gray-400">
              {new Date(show.first_air_date) > new Date() 
                ? `This show hasn't aired yet. It will premiere on ${new Date(show.first_air_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}. Spoilers will become available 3 months after the first episode airs.`
                : `This show recently premiered on ${new Date(show.first_air_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}. Spoilers will become available 3 months after premiere to avoid spoiling the experience for viewers.`
              }
            </p>
          </div>
        )}

        {/* Spoilers Content */}
        {spoilers && (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="relative z-10 bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6"
            >
              <h3 className="text-xl font-semibold text-white mb-6">
                Plot Spoilers
              </h3>
              
              <div className="prose prose-invert max-w-none">
                <div 
                  className="text-gray-300 leading-relaxed"
                  dangerouslySetInnerHTML={{ 
                    __html: formatSpoilerContent(spoilers) 
                  }}
                />
              </div>
            </motion.div>

            {/* Audio Player */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <SpoilerAudioPlayer 
                spoilerText={spoilers}
                movieTitle={show?.name || ''}
                cacheKey={cacheKey}
                existingAudioUrl={audioUrl}
                existingBackgroundUrl={backgroundAudioUrl}
              />
            </motion.div>
          </>
        )}

        {/* Error Display */}
        {error && spoilers === '' && (
          <div className="relative z-10 bg-red-500/10 border border-red-400/30 rounded-lg p-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <div>
                <h3 className="text-red-300 font-medium mb-1">Error</h3>
                <p className="text-red-200/80 text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}