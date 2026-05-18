"use client";

import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useUserSettings } from "@/hooks/useUserSettings";

interface SpoilerButtonProps {
  mediaId: string;
  title: string;
  type: 'movie' | 'tv';
  releaseYear?: number;
  releaseDate?: string; // Full release date for checking
  season?: number;
  className?: string;
  variant?: 'full' | 'compact';
}

export default function SpoilerButton({ 
  mediaId,
  title, 
  type, 
  releaseYear,
  releaseDate,
  season,
  className = "",
  variant = 'full'
}: SpoilerButtonProps) {
  const router = useRouter();
  const { settings, loading } = useUserSettings();

  // Check if spoilers should be available (content must be released for at least 3 months)
  const isSpoilerAvailable = (): boolean => {
    if (!releaseDate) return true; // If no date provided, show button (backward compatibility)
    
    const release = new Date(releaseDate);
    const now = new Date();
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    // Content must be released (not in future) and at least 3 months old
    return release <= now && release <= threeMonthsAgo;
  };

  // Hide button if user disabled spoilers OR content is too new/unreleased
  if (!loading && settings?.preferences?.showSpoilers === false) {
    return null;
  }

  if (!isSpoilerAvailable()) {
    return null;
  }

  const handleSpoilerClick = () => {
    const spoilerUrl = `/${type === 'movie' ? 'movies' : 'tv-shows'}/${mediaId}/spoilers`;
    router.push(spoilerUrl);
  };

  if (variant === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
      >
        <Button
          onClick={handleSpoilerClick}
          size="sm"
          className={`bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:via-indigo-400 hover:to-indigo-500 text-white font-medium border-0 shadow-lg shadow-indigo-500/30 transition-all duration-300 ${className}`}
        >
          <AlertTriangle className="w-3 h-3 mr-1" />
          <span className="text-xs font-medium">Listen to Spoilers</span>
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.2 }}
      className="w-full"
    >
      <Button
        onClick={handleSpoilerClick}
        className={`w-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:via-indigo-400 hover:to-indigo-500 text-white font-semibold py-3 sm:py-4 md:py-6 rounded-lg shadow-lg shadow-indigo-500/30 transition-all duration-300 ${className}`}
      >
        <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
        <span className="text-sm sm:text-base">Listen to Spoilers</span>
      </Button>
    </motion.div>
  );
}