"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X, Loader2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { spoilerService } from "@/lib/features/media/spoilerService";

interface SpoilerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  type: 'movie' | 'tv';
  releaseYear?: number;
  season?: number;
}

export default function SpoilerDialog({ 
  isOpen, 
  onClose, 
  title, 
  type, 
  releaseYear, 
  season 
}: SpoilerDialogProps) {
  const [spoilers, setSpoilers] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [showSpoilers, setShowSpoilers] = useState(false);

  // Lock body scroll when dialog is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = '0px'; // Prevent layout shift
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [isOpen]);

  const fetchSpoilers = async () => {
    setLoading(true);
    setError('');
    
    try {
      const result = type === 'movie' 
        ? await spoilerService.getMovieSpoilers(title, releaseYear)
        : await spoilerService.getTVShowSpoilers(title, season);
      
      if (result.success) {
        setSpoilers(result.spoilers);
        setShowSpoilers(true);
      } else {
        setError(result.error || 'Failed to fetch spoilers');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const resetDialog = () => {
    setSpoilers('');
    setShowSpoilers(false);
    setError('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden"
          onClick={resetDialog}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md" />
          
          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="relative w-full max-w-2xl max-h-[90vh] sm:max-h-[85vh] bg-black/95 backdrop-blur-xl rounded-xl sm:rounded-2xl border border-white/20 shadow-2xl overflow-hidden mx-2 sm:mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-600/20 rounded-full">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-white">Spoiler Alert</h3>
                  <p className="text-xs sm:text-sm text-gray-400 line-clamp-1">{title}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetDialog}
                className="text-gray-400 hover:text-white hover:bg-white/10 rounded-full w-10 h-10 p-0"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6">
              {!showSpoilers && !loading && !error && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center space-y-6"
                >
                  <div className="p-6 sm:p-8 bg-gradient-to-br from-red-600/10 to-orange-600/10 rounded-xl border border-red-500/20">
                    <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                    <h4 className="text-lg sm:text-xl font-bold text-white mb-2">Major Spoilers Ahead!</h4>
                    <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
                      This will reveal major plot points, twists, character deaths, and the ending of{' '}
                      <span className="font-semibold text-white">"{title}"</span>.
                    </p>
                    <p className="text-red-400 font-medium mt-4 text-sm sm:text-base">
                      Are you sure you want to continue?
                    </p>
                  </div>
                  
                  <div className="flex flex-col gap-3">
                    <Button
                      onClick={fetchSpoilers}
                      className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-semibold py-4 text-base"
                    >
                      <Eye className="w-5 h-5 mr-2" />
                      Yes, Show Spoilers
                    </Button>
                    <Button
                      onClick={resetDialog}
                      variant="outline"
                      className="w-full bg-white/5 border-white/20 text-white hover:bg-white/10 py-4 text-base"
                    >
                      No, Keep Safe
                    </Button>
                  </div>
                </motion.div>
              )}

              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12"
                >
                  <Loader2 className="w-12 h-12 animate-spin text-red-400 mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-white mb-2">Fetching Spoilers...</h4>
                  <p className="text-gray-400">Searching for the latest plot details and spoilers</p>
                </motion.div>
              )}

              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-8"
                >
                  <div className="p-6 bg-red-600/10 rounded-xl border border-red-500/20">
                    <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                    <h4 className="text-lg font-semibold text-red-400 mb-2">Failed to Load Spoilers</h4>
                    <p className="text-gray-300 mb-4">{error}</p>
                    <Button
                      onClick={fetchSpoilers}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      Try Again
                    </Button>
                  </div>
                </motion.div>
              )}

              {showSpoilers && spoilers && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="p-4 bg-red-600/10 rounded-lg border border-red-500/20 mb-6">
                    <div className="flex items-center gap-2 text-red-400 font-semibold mb-2">
                      <AlertTriangle className="w-4 h-4" />
                      <span>MAJOR SPOILERS BELOW</span>
                    </div>
                    <p className="text-gray-300 text-sm">
                      The following content contains detailed spoilers for "{title}"
                    </p>
                  </div>
                  
                  <div className="max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                    <div className="prose prose-invert max-w-none">
                      <div className="text-gray-100 leading-relaxed whitespace-pre-line">
                        {spoilers}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}