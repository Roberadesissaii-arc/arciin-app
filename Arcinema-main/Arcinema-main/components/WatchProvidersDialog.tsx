/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink, Tv2, ShoppingCart, Download } from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { projectFirestore as db } from "@/firebase/config";
import { toast } from "@/components/ui/use-toast";

interface WatchProvidersDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  mediaType: string;
  mediaId: string;
  title: string;
}

interface StreamingHistory {
  mediaId: string;
  mediaType: string;
  title: string;
  provider: string;
  timestamp: Date;
}

export function WatchProvidersDialog({ 
  isOpen, 
  onOpenChange, 
  mediaType, 
  mediaId, 
  title 
}: WatchProvidersDialogProps) {
  const { user } = useAuth();
  const [providers, setProviders] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'stream' | 'rent' | 'buy'>('stream');

  // Track streaming service click
  const handleProviderClick = async (provider: any, type: 'stream' | 'rent' | 'buy') => {
    if (!user) return;

    try {
      const streamingHistory: StreamingHistory = {
        mediaId,
        mediaType,
        title,
        provider: provider.provider_name,
        timestamp: new Date(),
      };

      // Update user's streaming history in Firestore
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        streamingHistory: arrayUnion(streamingHistory)
      });

      toast({
        title: "Streaming service selected",
        description: `Opening ${provider.provider_name} to watch ${title}`,
      });

      // Open provider link if available
      if (providers.link) {
        window.open(providers.link, '_blank');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update streaming history",
        variant: "destructive",
      });
    }
  };

  const tabs = [
    { id: 'stream', label: 'Stream', icon: Tv2, data: providers?.flatrate },
    { id: 'rent', label: 'Rent', icon: Download, data: providers?.rent },
    { id: 'buy', label: 'Buy', icon: ShoppingCart, data: providers?.buy },
  ] as const;

  // Add the missing fetch functionality
  useEffect(() => {
    const fetchProviders = async () => {
      if (!isOpen) return;
      
      setLoading(true);
      try {
        const response = await fetch(
          `https://api.themoviedb.org/3/${mediaType}/${mediaId}/watch/providers?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}`
        );
        const data = await response.json();
        setProviders(data.results?.US || null);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load streaming providers",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProviders();
  }, [isOpen, mediaType, mediaId]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-black/40 backdrop-blur-xl border-gray-800
                            h-[80vh] max-h-[800px] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0 space-y-4 pb-4 border-b border-gray-800">
          <DialogTitle asChild>
            <div className="text-center space-y-2">
              <span className="block text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 
                             bg-clip-text text-transparent">
                Where to Watch
              </span>
              <span className="block text-lg font-medium text-gray-200">
                {title}
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-gray-800 
                        scrollbar-track-transparent">
          {loading ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-full space-y-4"
            >
              <Loader2 className="w-8 h-8 animate-spin text-white/80" />
              <p className="text-gray-400 animate-pulse">Loading streaming options...</p>
            </motion.div>
          ) : !providers ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center h-full p-4"
            >
              <div className="bg-black/30 rounded-2xl p-6 backdrop-blur-sm max-w-md w-full">
                <Tv2 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-300 font-medium mb-2 text-center">
                  No streaming options found
                </p>
                <p className="text-gray-400 text-sm text-center">
                  This title isn&apos;t currently available for streaming in your region
                </p>
              </div>
            </motion.div>
          ) : (
            <div className="space-y-6 p-4">
              {/* Enhanced Tabs */}
              <div className="flex bg-black/20 rounded-lg p-1 sticky top-0 z-10 backdrop-blur-sm">
                {tabs.map(({ id, label, icon: Icon, data }) => data && (
                  <motion.button
                    key={id}
                    onClick={() => setSelectedTab(id)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-md
                      text-sm font-medium transition-all
                      ${selectedTab === id 
                        ? 'bg-indigo-500 text-white shadow-lg' 
                        : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                      }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{label}</span>
                  </motion.button>
                ))}
              </div>

              {/* Enhanced Content */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4"
                >
                  {providers[selectedTab === 'stream' ? 'flatrate' : selectedTab]?.map((provider: any) => (
                    <motion.button
                      key={provider.provider_id}
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleProviderClick(provider, selectedTab)}
                      className="group relative flex flex-col items-center gap-2 p-4 rounded-xl
                               bg-gradient-to-b from-white/10 to-white/5
                               hover:from-indigo-500/20 hover:to-purple-500/20 
                               border border-white/10 hover:border-indigo-500/50
                               transition-all duration-300"
                    >
                      <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden 
                                    group-hover:shadow-lg group-hover:shadow-indigo-500/20
                                    transition-all duration-300">
                        <Image
                          src={`https://image.tmdb.org/t/p/original${provider.logo_path}`}
                          alt={provider.provider_name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <span className="text-xs sm:text-sm font-medium text-center 
                                     text-gray-300 group-hover:text-white
                                     transition-colors line-clamp-2">
                        {provider.provider_name}
                      </span>
                    </motion.button>
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>
          )}
        </div>

        {providers?.link && (
          <div className="shrink-0 pt-4 mt-4 border-t border-gray-800">
            <Button
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 
                       hover:from-indigo-600 hover:to-purple-600
                       text-white shadow-lg shadow-indigo-500/20"
              onClick={() => window.open(providers.link, '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View All Options
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 