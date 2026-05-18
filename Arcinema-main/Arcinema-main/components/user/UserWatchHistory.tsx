"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { 
  Loader2, 
  ListPlus,
  Film, 
  Grid,
  LayoutList,
  ArrowUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { doc, getDoc } from 'firebase/firestore';
import { projectFirestore as db } from '@/firebase/config';
import FoldersList from "@/components/user/folders/FoldersList";
import type { CustomCollection } from "@/types/user";
import { cn } from "@/lib/utils";

function EmptyState() {
  const router = useRouter();
  
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-6 max-w-md mx-auto px-4">
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-32 h-32 rounded-full bg-white/5 flex items-center justify-center">
              <Film className="w-16 h-16 text-gray-600" />
            </div>
            <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
              <ListPlus className="w-5 h-5 text-indigo-400" />
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">No shared folders yet</h2>
          <p className="text-gray-400">
            When friends share folders with you, they'll appear here
          </p>
        </div>
        
        <Button 
          onClick={() => router.push('/user/my-list?tab=folders')}
          className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:via-indigo-400 hover:to-indigo-500 text-white font-medium
                   before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent"
        >
          <span className="relative z-10 flex items-center gap-2">
            <Film className="w-4 h-4" />
            Go to My Folders
          </span>
        </Button>
      </div>
    </div>
  );
}

export default function UserWatchHistory() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sharedFolders, setSharedFolders] = useState<CustomCollection[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'recent' | 'name'>('recent');

  const fetchSharedFolders = async () => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    try {
      setLoading(true);
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const customCollections = userData.customCollections || [];
        
        // Filter only folders that were shared FROM friends (have sharedFrom metadata)
        const shared = customCollections.filter((folder: CustomCollection) => 
          folder.sharedFrom !== undefined
        );
        
        setSharedFolders(shared);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSharedFolders();
  }, [user, router]);

  // Sort folders
  const sortedFolders = [...sharedFolders].sort((a, b) => {
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name);
    }
    // Default: most recent
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-20">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Shared Folders</h1>
              <p className="text-gray-400 max-w-2xl">
                Folders shared with you by friends. Discover their favorite movies and shows, and explore curated collections from people you trust.
              </p>
            </div>
            
            {/* Controls */}
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <ArrowUpDown className="w-4 h-4 mr-2" />
                    Sort
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setSortBy('recent')}>
                    Most Recent
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('name')}>
                    Name (A-Z)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setViewMode('grid')}
                  className={cn(viewMode === 'grid' && 'bg-white/10')}
                >
                  <Grid className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setViewMode('list')}
                  className={cn(viewMode === 'list' && 'bg-white/10')}
                >
                  <LayoutList className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button 
              onClick={() => router.push('/user/my-list?tab=folders')}
              className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:via-indigo-400 hover:to-indigo-500 text-white font-medium
                       before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent"
            >
              <span className="relative z-10 flex items-center gap-2">
                <ListPlus className="w-4 h-4" />
                My Folders
              </span>
            </Button>
            
            <Button 
              onClick={() => router.push('/movies')}
              variant="outline"
            >
              <Film className="w-4 h-4 mr-2" />
              Browse More
            </Button>
          </div>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {sortedFolders.length > 0 ? (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <FoldersList 
                folders={sortedFolders}
              />
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <EmptyState />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}