"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Loader2, 
  ListPlus,
  Film, 
  ArrowUpDown,
  Filter,
  Users,
  Folder,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { projectFirestore as db } from '@/firebase/config';
import SharedFoldersList from "@/components/user/folders/SharedFoldersList";
import type { CustomCollection } from "@/types/user";
import { cn } from "@/lib/utils";
import MyListCard from "@/components/user/MyCard/MyListCard";
import { ArrowLeft } from "lucide-react";
import { getPendingFolderInvites, acceptFolderInvite, rejectFolderInvite } from "@/lib/firebase/folderSharing";
import type { FolderShareInvite } from "@/types/user";
import { useToast } from "@/hooks/use-toast";
import { useCollaborativeFolders } from "@/hooks/useCollaborativeFolders";
import PendingFolderInvites from "@/components/user/folders/PendingFolderInvites";

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
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [sharedFolders, setSharedFolders] = useState<CustomCollection[]>([]);
  const [sortBy, setSortBy] = useState<'recent' | 'name'>('recent');
  const [mediaTypeFilter, setMediaTypeFilter] = useState<'all' | 'movie' | 'tv'>('all');
  const [activeTab, setActiveTab] = useState<'all' | 'collaborative' | 'individual'>('all');
  const [pendingInvitations, setPendingInvitations] = useState<FolderShareInvite[]>([]);
  const { collaborativeFolders } = useCollaborativeFolders(); // Use real-time hook
  
  // Check if viewing a specific folder
  const selectedFolderId = searchParams?.get('tab');
  const selectedFolder = sharedFolders.find(f => f.id === selectedFolderId);

  const fetchSharedFolders = async (showLoader = true) => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    try {
      // Only show loading spinner on initial load, not on background refreshes
      if (showLoader) {
        setLoading(true);
      }
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const customCollections = userData.customCollections || [];
        // Filter only regular shared folders (have sharedFrom metadata and are NOT collaborative)
        const regularShared = customCollections.filter((folder: CustomCollection) => 
          folder.sharedFrom !== undefined && !folder.isCollaborative
        );
        // All collaborative folders (both owned and received)
        const allCollabFolders = collaborativeFolders.map(f => ({
          ...f,
          // If user is the owner, don't show sharedFrom
          sharedFrom: f.ownerId === user.uid ? undefined : f.sharedFrom
        }));
        // Merge both types
        const allShared = [
          ...regularShared,
          ...allCollabFolders
        ];
        
        setSharedFolders(allShared);

        // Get pending folder invitations from the folderShareInvites collection
        const pending = await getPendingFolderInvites(user.uid);
        setPendingInvitations(pending);
      }
    } catch (error) {
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  };

  const handleAcceptInvitation = async (invitation: FolderShareInvite) => {
    if (!user) return;

    try {
      // Check if this is a collaborative invitation or regular share
      if (invitation.isCollaborative) {
        const { acceptCollaborativeInvite } = await import('@/lib/firebase/collaborativeFolders');
        const result = await acceptCollaborativeInvite(invitation.id, user.uid);
        
        if (result.success) {
          toast({
            title: "Collaborative Folder Accepted!",
            description: `You can now collaborate on "${invitation.folderName}"`,
          });
          // Silent refresh after accepting
          await fetchSharedFolders(false);
        } else {
          toast({
            title: "Error",
            description: result.message,
            variant: "destructive",
          });
        }
      } else {
        // Regular shared folder (view-only)
        const result = await acceptFolderInvite(invitation.id, user.uid);
        
        if (result.success) {
          toast({
            title: "Folder Accepted!",
            description: `You now have access to "${invitation.folderName}"`,
          });
          // Silent refresh after accepting
          await fetchSharedFolders(false);
        } else {
          toast({
            title: "Error",
            description: result.message,
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to accept invitation",
        variant: "destructive",
      });
    }
  };

  const handleDeclineInvitation = async (invitation: FolderShareInvite) => {
    if (!user) return;

    try {
      const result = await rejectFolderInvite(invitation.id, user.uid);
      
      if (result.success) {
        // Silent refresh after declining
        await fetchSharedFolders(false);
      } else {
      }
    } catch (error) {
    }
  };

  useEffect(() => {
    // Load shared folders when component mounts or collaborativeFolders change
    fetchSharedFolders(true);
  }, [user, router, collaborativeFolders]); // Re-fetch when collaborative folders update

  // Sort and filter folders
  const filteredFolders = sharedFolders.filter(folder => {
    // Filter by tab
    if (activeTab === 'collaborative' && !folder.isCollaborative) return false;
    if (activeTab === 'individual' && folder.isCollaborative) return false;
    return true;
  });

  // Log for debugging
  const sortedFolders = [...filteredFolders].sort((a, b) => {
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
    <div className="min-h-screen pt-24 pb-8 sm:pt-24">
      <div className="bg-black/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-12">
            <div>
              <h1 className="text-3xl font-bold mb-4 text-white">
                Shared Folders
              </h1>
              <p className="text-base text-gray-400 max-w-2xl">
                Folders shared with you by friends. Discover their favorite movies and shows, and explore curated collections from people you trust.
              </p>
            </div>

            <div className="flex gap-2 [@media(max-width:640px)]:w-full [@media(max-width:640px)]:flex-col">
              <Button 
                onClick={() => router.push('/user/my-list?tab=folders')}
                variant="outline"
                className="border-indigo-500/50 text-indigo-400 hover:bg-indigo-500/10 [@media(max-width:640px)]:h-10 [@media(max-width:640px)]:text-sm"
              >
                <ListPlus className="w-4 h-4 mr-2 [@media(max-width:640px)]:w-3.5 [@media(max-width:640px)]:h-3.5" />
                <span className="[@media(max-width:640px)]:text-xs">My Folders</span>
              </Button>
              <Button 
                onClick={() => router.push('/movies')}
                className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:via-indigo-400 hover:to-indigo-500 text-white font-medium
                         before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent
                         [@media(max-width:640px)]:h-10 [@media(max-width:640px)]:text-sm"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <Film className="w-4 h-4 [@media(max-width:640px)]:w-3.5 [@media(max-width:640px)]:h-3.5" />
                  <span className="[@media(max-width:640px)]:text-xs">Browse More</span>
                </span>
              </Button>
            </div>
          </div>

          {/* Navigation Tabs and Filter Controls */}
          <div className="pb-8">
            <div className="flex items-center justify-between gap-4
                          [@media(max-width:640px)]:flex-col">
              {/* Navigation Tabs - Left Side - 3 Columns */}
              <div className="flex flex-col gap-2 flex-1 w-full bg-black/20 backdrop-blur-sm rounded-xl border border-white/10 p-3">
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setActiveTab('all');
                      router.push('/user/shared-folders'); // Clear selected folder
                    }}
                    className={cn(
                      "h-12 gap-2 font-medium hover:bg-white/5",
                      activeTab === 'all' && 'bg-indigo-500 text-white hover:bg-indigo-500'
                    )}
                  >
                    <Folder className="w-4 h-4" />
                    <span className="sm:hidden">All</span>
                    <span className="hidden sm:inline">All</span>
                    <span className="text-xs ml-1">{sharedFolders.length}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setActiveTab('collaborative');
                      router.push('/user/shared-folders'); // Clear selected folder
                    }}
                    className={cn(
                      "h-12 gap-2 font-medium hover:bg-white/5",
                      activeTab === 'collaborative' && 'bg-indigo-500 text-white hover:bg-indigo-500'
                    )}
                  >
                    <Users className="w-4 h-4" />
                    <span className="sm:hidden">Col.</span>
                    <span className="hidden sm:inline">Collab</span>
                    <span className="text-xs ml-1">
                      {sharedFolders.filter(f => f.isCollaborative).length}
                    </span>
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setActiveTab('individual');
                      router.push('/user/shared-folders'); // Clear selected folder
                    }}
                    className={cn(
                      "h-12 gap-2 font-medium hover:bg-white/5",
                      activeTab === 'individual' && 'bg-indigo-500 text-white hover:bg-indigo-500'
                    )}
                  >
                    <UserPlus className="w-4 h-4" />
                    <span className="sm:hidden">Sha.</span>
                    <span className="hidden sm:inline">Shared</span>
                    <span className="text-xs ml-1">
                      {sharedFolders.filter(f => !f.isCollaborative).length}
                    </span>
                  </Button>
                </div>
              </div>

              {/* Filter Controls - Right Side */}
              <div className="grid grid-cols-2 gap-2 bg-black/20 backdrop-blur-sm rounded-xl border border-white/10 p-3
                            [@media(max-width:640px)]:grid-cols-2 [@media(max-width:640px)]:w-full [@media(max-width:640px)]:gap-1.5 [@media(max-width:640px)]:p-2">
                {/* Media Type Filter */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="h-12 w-12 border-white/10 hover:bg-white/5 [@media(max-width:640px)]:h-10 [@media(max-width:640px)]:w-10" title="Filter by Type">
                      <Filter className="w-4 h-4 [@media(max-width:640px)]:w-3.5 [@media(max-width:640px)]:h-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-black/95 backdrop-blur-xl border-white/10">
                    <DropdownMenuItem onClick={() => setMediaTypeFilter('all')}>
                      All Types
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setMediaTypeFilter('movie')}>
                      Movies Only
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setMediaTypeFilter('tv')}>
                      TV Shows Only
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Sort Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="h-12 w-12 border-white/10 hover:bg-white/5 [@media(max-width:640px)]:h-10 [@media(max-width:640px)]:w-10" title="Sort">
                      <ArrowUpDown className="w-4 h-4 [@media(max-width:640px)]:w-3.5 [@media(max-width:640px)]:h-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-black/95 backdrop-blur-xl border-white/10">
                    <DropdownMenuItem onClick={() => setSortBy('recent')}>
                      Recently Added
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSortBy('name')}>
                      Name (A-Z)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          {/* Pending Invitations - After Navigation */}
          {pendingInvitations.length > 0 && (
            <div className="mb-8 mt-8">
              <PendingFolderInvites 
                onInviteAccepted={() => fetchSharedFolders(false)}
              />
            </div>
          )}

          {/* Content */}
          <div className="mt-8">
          <AnimatePresence mode="wait">
            {selectedFolder ? (
              /* Viewing a specific folder - show its content */
              <motion.div
                key="folder-content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {/* Folder header */}
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-2">
                    {selectedFolder.isCollaborative ? (
                      <>
                        <Users className="w-8 h-8 text-indigo-400" />
                        <h2 className="text-3xl font-bold text-white">{selectedFolder.name}</h2>
                        <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 rounded-full text-xs font-bold text-white">
                          <Users className="w-3 h-3" />
                          <span>Collaborative</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <Folder className="w-8 h-8 text-indigo-400" />
                        <h2 className="text-3xl font-bold text-white">{selectedFolder.name}</h2>
                      </>
                    )}
                  </div>
                  <p className="text-gray-400">
                    {selectedFolder.items.length} {selectedFolder.items.length === 1 ? 'item' : 'items'}
                  </p>
                </div>

                {/* Movie cards */}
                {selectedFolder.items.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                      <Folder className="w-12 h-12 text-gray-600" />
                    </div>
                    <p className="text-gray-400">This folder is empty</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-6 
                                [@media(max-width:1280px)]:grid-cols-3 
                                [@media(max-width:1024px)]:grid-cols-3 
                                [@media(max-width:768px)]:grid-cols-2 
                                [@media(max-width:640px)]:grid-cols-2 
                                [@media(max-width:640px)]:gap-4">
                    {selectedFolder.items.map((item) => (
                      <MyListCard
                        key={item.id}
                        movie={item}
                        currentList={selectedFolder.id}
                        showActions={selectedFolder.isCollaborative} // Only show remove for collaborative
                        sharedByUsername={selectedFolder.sharedFrom?.userName} // Pass who shared it
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            ) : sortedFolders.length > 0 ? (
              /* Folder grid view */
              <motion.div
                key="content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <SharedFoldersList 
                  folders={sortedFolders}
                  onSelectFolder={(folderId) => {
                    // Open folder content on the same page
                    router.push(`/user/shared-folders?tab=${folderId}`);
                  }}
                />
              </motion.div>
            ) : (
              /* Empty state */
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
      </div>
    </div>
  );
}