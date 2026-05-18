// app/user/activity/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { projectFirestore as db } from '@/firebase/config';
import { 
  Search, 
  Eye, 
  Heart, 
  Plus, 
  Clock,
  Calendar,
  Filter,
  RefreshCw,
  MoreHorizontal,
  Trash2,
  CheckSquare,
  Square,
  Trash,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UserActivity {
  id: string;
  type: 'search' | 'view' | 'add_to_list' | 'rate';
  mediaId?: number;
  mediaTitle?: string;
  mediaType?: 'movie' | 'tv';
  searchQuery?: string;
  listType?: 'watchlist' | 'favorites' | 'watched';
  timestamp: Date;
  metadata?: Record<string, any>;
}

export default function ActivityPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [displayCount, setDisplayCount] = useState<number>(10); // Show 10 items initially
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    const loadActivities = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const userActivities = userData.activities || [];
          
          // Convert timestamp strings back to Date objects and sort by newest first
          const processedActivities = userActivities
            .map((activity: any) => ({
              ...activity,
              timestamp: activity.timestamp instanceof Date 
                ? activity.timestamp 
                : activity.timestamp?.toDate?.() || new Date(activity.timestamp || Date.now())
            }))
            .sort((a: UserActivity, b: UserActivity) => 
              b.timestamp.getTime() - a.timestamp.getTime()
            );

          setActivities(processedActivities);
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load activity data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadActivities();
  }, [user, router, toast]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'search':
        return <Search className="w-4 h-4" />;
      case 'view':
        return <Eye className="w-4 h-4" />;
      case 'add_to_list':
        return <Plus className="w-4 h-4" />;
      case 'rate':
        return <Heart className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'search':
        return 'bg-blue-500/20 text-blue-400';
      case 'view':
        return 'bg-green-500/20 text-green-400';
      case 'add_to_list':
        return 'bg-purple-500/20 text-purple-400';
      case 'rate':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getActivityDescription = (activity: UserActivity) => {
    switch (activity.type) {
      case 'search':
        return `Searched for "${activity.searchQuery}"`;
      case 'view':
        return `Viewed ${activity.mediaType === 'tv' ? 'TV show' : 'movie'}: ${activity.mediaTitle}`;
      case 'add_to_list':
        return `Added ${activity.mediaTitle} to ${activity.listType}`;
      case 'rate':
        return `Rated ${activity.mediaTitle}`;
      default:
        return 'Unknown activity';
    }
  };

  const filteredActivities = activities.filter(activity => {
    if (filter === 'all') return true;
    return activity.type === filter;
  });

  // Get the activities to display based on displayCount
  const displayedActivities = filteredActivities.slice(0, displayCount);
  const hasMoreActivities = (filteredActivities.length || 0) > (displayCount || 0);

  const handleLoadMore = () => {
    setLoadingMore(true);
    
    // Simulate loading delay for better UX
    setTimeout(() => {
      setDisplayCount(prev => Math.max(10, (prev || 10) + 10));
      setLoadingMore(false);
    }, 500);
  };

  // Reset display count when filter changes
  useEffect(() => {
    setDisplayCount(10);
  }, [filter]);

  // Ensure displayCount is always a valid number
  useEffect(() => {
    if (!displayCount || isNaN(displayCount) || displayCount < 1) {
      setDisplayCount(10);
    }
  }, [displayCount]);

  const formatDate = (date: Date) => {
    // Check if date is valid
    if (!date || isNaN(date.getTime())) {
      return 'Unknown time';
    }
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return diffMinutes <= 0 ? 'Just now' : `${diffMinutes} minutes ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hours ago`;
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const handleSelectAll = () => {
    if (selectedItems.size === displayedActivities.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(displayedActivities.map(a => a.id)));
    }
  };

  const handleSelectItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const handleDeleteSelected = async () => {
    if (!user || selectedItems.size === 0) return;

    try {
      const remainingActivities = activities.filter(activity => !selectedItems.has(activity.id));
      
      await updateDoc(doc(db, 'users', user.uid), {
        activities: remainingActivities.map(activity => ({
          ...activity,
          timestamp: activity.timestamp instanceof Date ? activity.timestamp : new Date(activity.timestamp)
        }))
      });

      setActivities(remainingActivities);
      setSelectedItems(new Set());
      setIsSelectionMode(false);
      
      toast({
        title: "Success",
        description: `Deleted ${selectedItems.size} activities`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete activities",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSingle = async (activityId: string) => {
    if (!user) return;

    try {
      const remainingActivities = activities.filter(activity => activity.id !== activityId);
      
      await updateDoc(doc(db, 'users', user.uid), {
        activities: remainingActivities.map(activity => ({
          ...activity,
          timestamp: activity.timestamp instanceof Date ? activity.timestamp : new Date(activity.timestamp)
        }))
      });

      setActivities(remainingActivities);
      
      toast({
        title: "Success",
        description: "Activity deleted",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete activity",
        variant: "destructive",
      });
    }
  };

  const handleViewDetails = (activity: UserActivity) => {
    if (activity.type === 'search') {
      router.push(`/search?q=${encodeURIComponent(activity.searchQuery || '')}`);
    } else if (activity.mediaId) {
      router.push(`/${activity.mediaType === 'tv' ? 'tv' : 'movies'}/${activity.mediaId}`);
    } else {
      // For activities without specific destination, go to relevant page
      switch (activity.type) {
        case 'add_to_list':
          if (activity.listType === 'watchlist') {
            router.push('/user/my-list');
          } else if (activity.listType === 'favorites') {
            router.push('/user/likes');
          } else {
            router.push('/user/watch-history');
          }
          break;
        default:
          router.push('/movies'); // Default fallback
      }
    }
  };

  if (loading) {
    return (
      <div className="container max-w-6xl mx-auto px-4 py-8 pt-24">
        <div className="flex items-center justify-center">
          <RefreshCw className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto px-4 py-8 pt-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:items-start md:items-center justify-between gap-4 mb-12">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2 md:mb-4">
              Activity
            </h1>
            <p className="text-gray-400 text-sm md:text-base">
              Track your viewing history and activities
            </p>
          </div>
          
          <div className="flex flex-col space-y-2 md:space-y-0 md:flex-row md:items-center gap-2 md:gap-4">
            {/* Top row for mobile - Selection and bulk actions */}
            <div className="flex items-center gap-2 md:gap-4 order-2 md:order-1">
              {/* Selection Mode Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsSelectionMode(!isSelectionMode);
                  setSelectedItems(new Set());
                }}
                className="bg-white/5 border-white/10 text-white hover:bg-white/10 text-xs md:text-sm"
              >
                {isSelectionMode ? (
                  <>
                    <Square className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                    <span className="hidden sm:inline">Cancel</span>
                    <span className="sm:hidden">✕</span>
                  </>
                ) : (
                  <>
                    <CheckSquare className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                    <span className="hidden sm:inline">Select</span>
                    <span className="sm:hidden">☐</span>
                  </>
                )}
              </Button>

              {/* Bulk Actions - Show when items are selected */}
              {isSelectionMode && selectedItems.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteSelected}
                  className="bg-red-600 hover:bg-red-700 text-xs md:text-sm"
                >
                  <Trash className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Delete ({selectedItems.size})</span>
                  <span className="sm:hidden">🗑️ {selectedItems.size}</span>
                </Button>
              )}

              {/* Select All/None button */}
              {isSelectionMode && displayedActivities.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  className="bg-white/5 border-white/10 text-white hover:bg-white/10 text-xs md:text-sm"
                >
                  <span className="hidden sm:inline">
                    {selectedItems.size === displayedActivities.length ? 'Deselect All' : 'Select All'}
                  </span>
                  <span className="sm:hidden">
                    {selectedItems.size === displayedActivities.length ? '☑️' : '☐'}
                  </span>
                </Button>
              )}
            </div>

            {/* Filter dropdown */}
            <div className="order-1 md:order-2">
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-full md:w-40 bg-black/50 border-white/10 text-xs md:text-sm">
                  <Filter className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                  <SelectValue placeholder="Filter activities" />
                </SelectTrigger>
                <SelectContent className="bg-black/90 border-white/10">
                  <SelectItem value="all">All Activities</SelectItem>
                  <SelectItem value="search">Searches</SelectItem>
                  <SelectItem value="view">Views</SelectItem>
                  <SelectItem value="add_to_list">List Actions</SelectItem>
                  <SelectItem value="rate">Ratings</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {filteredActivities.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Activity Yet</h3>
            <p className="text-gray-400 mb-6">
              Start exploring movies and TV shows to see your activity here!
            </p>
            <Button onClick={() => router.push('/movies')}>
              Browse Movies
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-3 md:space-y-4">
              {displayedActivities.map((activity, index) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group bg-white/5 border border-white/10 rounded-lg p-3 md:p-4 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-start md:items-center justify-between gap-2 md:gap-4">
                    <div className="flex items-start md:items-center gap-2 md:gap-4 flex-1 min-w-0">
                      {/* Selection Checkbox */}
                      {isSelectionMode && (
                        <div className="mt-1 md:mt-0">
                          <Checkbox
                            checked={selectedItems.has(activity.id)}
                            onCheckedChange={() => handleSelectItem(activity.id)}
                            className="border-white/20 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                          />
                        </div>
                      )}

                      <div className={`p-1.5 md:p-2 rounded-full ${getActivityColor(activity.type)} shrink-0 mt-1 md:mt-0`}>
                        {getActivityIcon(activity.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm md:text-base leading-tight md:leading-normal">
                          {getActivityDescription(activity)}
                        </p>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs w-fit">
                            {activity.type}
                          </Badge>
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(activity.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-2 shrink-0">
                      {/* View Details Button - Always show */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(activity)}
                        className="opacity-100 group-hover:opacity-100 transition-opacity text-xs md:text-sm px-2 md:px-3 py-1 md:py-2 h-auto"
                      >
                        <ExternalLink className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                        <span className="hidden sm:inline">View Details</span>
                        <span className="sm:hidden">View</span>
                      </Button>

                      {/* Delete Button - Show on hover or in selection mode */}
                      {!isSelectionMode && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity text-xs md:text-sm px-2 md:px-3 py-1 md:py-2 h-auto"
                            >
                              <MoreHorizontal className="w-3 h-3 md:w-4 md:h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-black/90 border-white/10" align="end">
                            <DropdownMenuItem
                              onClick={() => handleDeleteSingle(activity.id)}
                              className="text-red-400 hover:bg-red-500/10"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Load More Button */}
            {hasMoreActivities && (
              <div className="flex justify-center pt-4 md:pt-6">
                <Button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  variant="outline"
                  className="bg-white/5 border-white/10 text-white hover:bg-white/10 px-4 md:px-8 text-sm md:text-base"
                >
                  {loadingMore ? (
                    <>
                      <RefreshCw className="w-3 h-3 md:w-4 md:h-4 mr-2 animate-spin" />
                      <span className="hidden sm:inline">Loading...</span>
                      <span className="sm:hidden">...</span>
                    </>
                  ) : (
                    <>
                      <span className="hidden sm:inline">Load More</span>
                      <span className="sm:hidden">More</span>
                      <span className="ml-1 md:ml-2 text-xs text-gray-400">
                        ({Math.max(0, (filteredActivities.length || 0) - (displayCount || 0))})
                      </span>
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Activity Summary */}
            <div className="flex justify-center pt-2 md:pt-4">
              <p className="text-xs md:text-sm text-gray-400 text-center">
                Showing {Math.min(displayCount || 0, filteredActivities.length || 0)} of {filteredActivities.length || 0} activities
              </p>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
