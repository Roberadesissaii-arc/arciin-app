"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bell, 
  Check, 
  ArrowLeft, 
  Grid,
  LayoutList,
  Filter,
  Calendar,
  ExternalLink,
  Loader2,
  Film,
  CheckCircle,
  Clock,
  Eye,
  Tv,
  Folder,
  UserPlus
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { cn } from '@/lib/utils';

const notificationTypes = [
  { id: 'all', label: 'All', icon: Bell },
  { id: 'unread', label: 'Unread', icon: CheckCircle },
  { id: 'folder_share', label: 'Folders', icon: Folder },
  { id: 'new_release', label: 'New Movies', icon: Film },
  { id: 'new_tv_release', label: 'New TV Shows', icon: Tv },
] as const;

function EmptyState({ type }: { type: string }) {
  return (
    <div className="text-center space-y-6 py-16">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">
          {type === 'unread' ? 'No unread notifications' : 'No notifications yet'}
        </h2>
        <p className="text-gray-400">
          {type === 'unread' 
            ? 'All caught up! Check back later for new updates.'
            : 'We\'ll notify you about new releases, updates, and recommendations'
          }
        </p>
      </div>
    </div>
  );
}

// Notification Card Component
function NotificationCard({ 
  notification, 
  viewMode, 
  onClick 
}: {
  notification: any;
  viewMode: 'grid' | 'list';
  onClick: () => void;
}) {
  const router = useRouter();
  
  const getPlaceholderImage = () => {
    // For folder notifications, use a folder icon background
    if (notification.type === 'folder_share' || notification.type === 'collaborative_folder') {
      return '/icons/folder-placeholder.png';
    }
    return `https://picsum.photos/400/600?random=${notification.id || Math.random()}`;
  };

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (notification.type === 'folder_share' || notification.type === 'collaborative_folder') {
      router.push('/user/my-list?tab=pending');
    }
  };

  if (viewMode === 'grid') {
    const isFolderNotification = notification.type === 'folder_share' || notification.type === 'collaborative_folder';
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "group relative bg-black/40 backdrop-blur-xl rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer hover:scale-105 border",
          !notification.isRead 
            ? "border-zinc-600 ring-2 ring-zinc-700/50" 
            : "border-white/10 hover:border-white/20"
        )}
        onClick={onClick}
      >
        <div className="aspect-[2/3] relative">
          {isFolderNotification ? (
            notification.movieData?.poster_path || notification.tvShowData?.poster_path ? (
              <>
                <Image
                  src={`https://image.tmdb.org/t/p/w500${notification.movieData?.poster_path || notification.tvShowData?.poster_path}`}
                  alt={notification.movieData?.title || notification.tvShowData?.name || 'Movie'}
                  fill
                  className="object-cover"
                />
                {/* Folder icon overlay - top right corner with indigo color */}
                <div className="absolute top-3 right-3 w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full flex items-center justify-center border-2 border-black shadow-lg z-10">
                  <Folder className="w-5 h-5 text-white" />
                </div>
              </>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/90 via-indigo-600/90 to-indigo-700/90 flex items-center justify-center">
                <Folder className="w-24 h-24 text-white/80 drop-shadow-lg" />
              </div>
            )
          ) : (
            <Image
              src={notification.movieData?.poster_path || notification.tvShowData?.poster_path
                ? `https://image.tmdb.org/t/p/w500${notification.movieData?.poster_path || notification.tvShowData?.poster_path}`
                : getPlaceholderImage()
              }
              alt={notification.movieData?.title || notification.tvShowData?.name || notification.title || 'Notification'}
              fill
              className="object-cover"
            />
          )}
          
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
          
          {/* Unread Badge */}
          {!notification.isRead && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute top-2 right-2 z-10"
            >
              <div className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 text-white rounded-full w-7 h-7 flex items-center justify-center shadow-lg">
                <Bell className="w-4 h-4" />
              </div>
            </motion.div>
          )}
          
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="font-bold text-white text-sm mb-1.5 line-clamp-2 leading-tight">
              {notification.title}
            </h3>
            <p className="text-gray-300 text-xs line-clamp-2 mb-3 leading-relaxed">
              {notification.message || 'No message'}
            </p>
            
            {/* Action Button for Folder Notifications */}
            {isFolderNotification && (
              <Button
                size="sm"
                onClick={handleActionClick}
                className="w-full mb-2 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white border-0"
              >
                <UserPlus className="w-3 h-3 mr-1" />
                View Invite
              </Button>
            )}
            
            <div className="flex items-center justify-between text-[10px] text-gray-400 gap-2">
              <span className="capitalize bg-zinc-800/60 backdrop-blur-sm px-2 py-1 rounded-full border border-zinc-700/50 truncate">
                {isFolderNotification ? 'Folder Share' : notification.type?.replace('_', ' ').replace('new ', '')}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {notification.createdAt ? 
                  new Date(notification.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 
                  'N/A'
                }
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  const isFolderNotification = notification.type === 'folder_share' || notification.type === 'collaborative_folder';
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "group flex items-center gap-4 p-4 sm:p-5 bg-black/40 backdrop-blur-xl rounded-2xl transition-all duration-300 cursor-pointer hover:scale-[1.02] border",
        !notification.isRead 
          ? "border-zinc-600 ring-2 ring-zinc-700/50" 
          : "border-white/10 hover:border-white/20"
      )}
      onClick={onClick}
    >
      <div className="relative w-20 h-28 flex-shrink-0 sm:w-24 sm:h-32">
        {isFolderNotification ? (
          notification.movieData?.poster_path || notification.tvShowData?.poster_path ? (
            <>
              <Image
                src={`https://image.tmdb.org/t/p/w185${notification.movieData?.poster_path || notification.tvShowData?.poster_path}`}
                alt={notification.movieData?.title || notification.tvShowData?.name || 'Movie'}
                fill
                className="object-cover rounded-xl"
              />
              {/* Folder icon overlay */}
              <div className="absolute -top-2 -right-2 w-7 h-7 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full flex items-center justify-center border-2 border-black shadow-lg">
                <Folder className="w-4 h-4 text-white" />
              </div>
            </>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-indigo-500/90 via-indigo-600/90 to-indigo-700/90 rounded-xl flex items-center justify-center">
              <Folder className="w-12 h-12 text-white/80 drop-shadow-lg" />
            </div>
          )
        ) : (
          <Image
            src={notification.movieData?.poster_path || notification.tvShowData?.poster_path
              ? `https://image.tmdb.org/t/p/w185${notification.movieData?.poster_path || notification.tvShowData?.poster_path}`
              : getPlaceholderImage()
            }
            alt={notification.movieData?.title || notification.tvShowData?.name || notification.title || 'Notification'}
            fill
            className="object-cover rounded-xl"
          />
        )}
        {!notification.isRead && (
          <div className="absolute -top-2 -right-2 bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-lg border-2 border-black">
            <Bell className="w-3 h-3" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
          <h3 className={cn(
            "font-bold text-lg sm:text-xl group-hover:text-gray-300 transition-colors",
            notification.isRead ? "text-gray-300" : "text-white"
          )}>
            {notification.title}
          </h3>
          <span className="text-xs capitalize bg-zinc-800/60 backdrop-blur-sm px-3 py-1.5 rounded-full border border-zinc-700/50 whitespace-nowrap flex items-center gap-1">
            {isFolderNotification && <Folder className="w-3 h-3" />}
            {isFolderNotification ? 'Folder Share' : notification.type?.replace('_', ' ').replace('new ', '')}
          </span>
        </div>
        
        <p className="text-gray-400 mb-3 line-clamp-2 text-sm sm:text-base leading-relaxed">
          {notification.message || 'No message'}
        </p>
        
        {/* Action Button for Folder Notifications */}
        {isFolderNotification && (
          <Button
            size="sm"
            onClick={handleActionClick}
            className="mb-3 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white border-0"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            View & Accept Invite
          </Button>
        )}
        
        <div className="flex items-center gap-4 text-xs sm:text-sm text-gray-500">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            {notification.createdAt ? (
              <>
                {new Date(notification.createdAt).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric',
                  year: 'numeric'
                })} at{' '}
                {new Date(notification.createdAt).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </>
            ) : (
              'No date available'
            )}
          </span>
          {(notification.movieData?.id || notification.tvShowData?.id) && (
            <span className="flex items-center gap-1.5 text-gray-400">
              <ExternalLink className="w-4 h-4" />
              View Details
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function NotificationsContainer() {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();
  const { user } = useAuth();
  const router = useRouter();
  const [activeType, setActiveType] = useState<'all' | 'unread' | 'folder_share' | 'new_release' | 'new_tv_release'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [statusFilter, setStatusFilter] = useState<'all' | 'read' | 'unread'>('all');
  const [heroMovies, setHeroMovies] = useState<any[]>([]);

  // Fetch popular movies for hero background
  useEffect(() => {
    const fetchHeroMovies = async () => {
      try {
        const response = await fetch(
          `https://api.themoviedb.org/3/trending/movie/week?language=en-US`,
          {
            headers: {
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_TMDB_API_READ_ACCESS_TOKEN}`,
            },
          }
        );
        const data = await response.json();
        setHeroMovies(data.results.slice(0, 24));
      } catch (error) {
      }
    };

    fetchHeroMovies();
  }, []);

  const getFilteredNotifications = () => {
    let filtered = notifications;

    if (activeType === 'unread') {
      filtered = filtered.filter(n => !n.isRead);
    } else if (activeType !== 'all') {
      filtered = filtered.filter(n => n.type === activeType);
    }

    if (statusFilter === 'read') {
      filtered = filtered.filter(n => n.isRead);
    } else if (statusFilter === 'unread') {
      filtered = filtered.filter(n => !n.isRead);
    }

    return filtered;
  };

  const handleNotificationClick = async (notification: any) => {
    setTimeout(async () => {
      if (!notification.isRead) {
        await markAsRead(notification.id);
      }
    }, 150);
    
    // For folder notifications, go to shared folders page
    if (notification.type === 'folder_share' || notification.type === 'collaborative_folder') {
      router.push('/user/shared-folders');
      return;
    }
    
    if (notification.movieData?.id) {
      router.push(`/movies/${notification.movieData.id}`);
    } else if (notification.tvShowData?.id) {
      router.push(`/tv-shows/${notification.tvShowData.id}`);
    }
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  if (!user) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="text-center">
          <Bell className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Please Log In</h1>
          <p className="text-gray-400 mb-4">You need to be logged in to view notifications</p>
          <Button onClick={() => router.push('/auth/login')}>
            Log In
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const filteredNotifications = getFilteredNotifications();

  if (notifications.length === 0) {
    return (
      <div className="min-h-screen">
        <div className="max-w-4xl mx-auto px-4 py-20">
          <EmptyState type="all" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8 relative bg-black">
      {/* Hero Background - Popular Movies Grid */}
      <div className="absolute inset-0 h-[40vh] md:h-[50vh] overflow-hidden">
        <div className="absolute inset-0 grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-0 opacity-30">
          {heroMovies.map((movie, index) => (
            <div key={movie.id || index} className="relative aspect-[2/3] bg-gray-900">
              {movie.poster_path ? (
                <Image
                  src={`https://image.tmdb.org/t/p/w342${movie.poster_path}`}
                  alt=""
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900" />
              )}
            </div>
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/80 to-black" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <div className="bg-black/50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-12">
              <div>
                <h1 className="text-3xl font-bold mb-4 text-white">
                  Notifications
                </h1>
                <p className="text-base text-gray-400 max-w-2xl">
                  {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up! Stay updated with new releases and folder shares.'}
                </p>
              </div>
            </div>
            {/* Tabs Section */}
            <div className="pb-8">
              <Tabs
                defaultValue="all"
                value={activeType}
                onValueChange={(value) => setActiveType(value as typeof activeType)}
              >
                <div className="flex items-center justify-between gap-4
                              [@media(max-width:640px)]:flex-col">
                  {/* Navigation - 2 rows matching my-list style */}
                  <div className="flex flex-col gap-2 flex-1 w-full bg-black/20 backdrop-blur-sm rounded-xl border border-white/10 p-3">
                    {/* First Row */}
                    <TabsList className="grid grid-cols-3 gap-2 bg-transparent h-auto p-0">
                      <TabsTrigger
                        value="all"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        className="h-12 gap-2 data-[state=active]:bg-indigo-500 data-[state=active]:text-white font-medium bg-transparent hover:bg-white/5"
                      >
                        <Bell className="w-4 h-4" />
                        <span className="sm:hidden">All</span>
                        <span className="hidden sm:inline">All</span>
                        <span className="text-xs ml-1">{notifications.length > 5 ? '5+' : notifications.length}</span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="unread"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        className="h-12 gap-2 data-[state=active]:bg-indigo-500 data-[state=active]:text-white font-medium bg-transparent hover:bg-white/5"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span className="sm:hidden">Unr.</span>
                        <span className="hidden sm:inline">Unread</span>
                        <span className="text-xs ml-1">{unreadCount > 5 ? '5+' : unreadCount}</span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="folder_share"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        className="h-12 gap-2 data-[state=active]:bg-indigo-500 data-[state=active]:text-white font-medium bg-transparent hover:bg-white/5"
                      >
                        <Folder className="w-4 h-4" />
                        <span className="sm:hidden">Fol.</span>
                        <span className="hidden sm:inline">Folders</span>
                        <span className="text-xs ml-1">
                          {notifications.filter(n => n.type === 'folder_share' || n.type === 'collaborative_folder').length > 5 
                            ? '5+' 
                            : notifications.filter(n => n.type === 'folder_share' || n.type === 'collaborative_folder').length}
                        </span>
                      </TabsTrigger>
                    </TabsList>

                    {/* Second Row */}
                    <TabsList className="grid grid-cols-2 gap-2 bg-transparent h-auto p-0">
                      <TabsTrigger
                        value="new_release"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        className="h-12 gap-2 data-[state=active]:bg-indigo-500 data-[state=active]:text-white font-medium bg-transparent hover:bg-white/5"
                      >
                        <Film className="w-4 h-4" />
                        <span className="sm:hidden">Mov.</span>
                        <span className="hidden sm:inline">New Movies</span>
                        <span className="text-xs ml-1">
                          {notifications.filter(n => n.type === 'new_release').length > 5 
                            ? '5+' 
                            : notifications.filter(n => n.type === 'new_release').length}
                        </span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="new_tv_release"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        className="h-12 gap-2 data-[state=active]:bg-indigo-500 data-[state=active]:text-white font-medium bg-transparent hover:bg-white/5"
                      >
                        <Tv className="w-4 h-4" />
                        <span className="sm:hidden">TV</span>
                        <span className="hidden sm:inline">New TV Shows</span>
                        <span className="text-xs ml-1">
                          {notifications.filter(n => n.type === 'new_tv_release').length > 5 
                            ? '5+' 
                            : notifications.filter(n => n.type === 'new_tv_release').length}
                        </span>
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  {/* View Controls - 2x2 Grid on Desktop, Single Row on Mobile */}
                  <div className="grid grid-cols-2 gap-2 bg-black/20 backdrop-blur-sm rounded-xl border border-white/10 p-3
                                [@media(max-width:640px)]:grid-cols-4 [@media(max-width:640px)]:w-full [@media(max-width:640px)]:gap-1.5 [@media(max-width:640px)]:p-2">
                    {/* View Mode Toggle - Grid */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setViewMode('grid')}
                      className={cn(
                        "h-12 w-12 hover:bg-white/5 [@media(max-width:640px)]:h-10 [@media(max-width:640px)]:w-10",
                        viewMode === 'grid' && 'bg-white/10'
                      )}
                      title="Grid View"
                    >
                      <Grid className="w-4 h-4 [@media(max-width:640px)]:w-3.5 [@media(max-width:640px)]:h-3.5" />
                    </Button>

                    {/* View Mode Toggle - List */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setViewMode('list')}
                      className={cn(
                        "h-12 w-12 hover:bg-white/5 [@media(max-width:640px)]:h-10 [@media(max-width:640px)]:w-10",
                        viewMode === 'list' && 'bg-white/10'
                      )}
                      title="List View"
                    >
                      <LayoutList className="w-4 h-4 [@media(max-width:640px)]:w-3.5 [@media(max-width:640px)]:h-3.5" />
                    </Button>

                    {/* Filter Dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon" className="h-12 w-12 border-white/10 hover:bg-white/5 [@media(max-width:640px)]:h-10 [@media(max-width:640px)]:w-10" title="Filter">
                          <Filter className="w-4 h-4 [@media(max-width:640px)]:w-3.5 [@media(max-width:640px)]:h-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-black/95 backdrop-blur-xl border-white/10">
                        <DropdownMenuItem onClick={() => setStatusFilter('all')}>
                          All Status
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setStatusFilter('unread')}>
                          Unread Only
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setStatusFilter('read')}>
                          Read Only
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Mark All as Read Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleMarkAllAsRead}
                      disabled={unreadCount === 0}
                      className={cn(
                        "h-12 w-12 hover:bg-white/5 [@media(max-width:640px)]:h-10 [@media(max-width:640px)]:w-10",
                        unreadCount === 0 && "opacity-50 cursor-not-allowed"
                      )}
                      title="Mark All as Read"
                    >
                      <CheckCircle className="w-4 h-4 [@media(max-width:640px)]:w-3.5 [@media(max-width:640px)]:h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Content */}
                <div className="mt-8">
                {notificationTypes.map(({ id }) => (
                  <TabsContent key={id} value={id}>
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={`${id}-${viewMode}-${statusFilter}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        {filteredNotifications.length === 0 ? (
                          <EmptyState type={id} />
                        ) : (
                          <div className={cn(
                            viewMode === 'grid'
                              ? "grid gap-3 sm:gap-4 lg:gap-6 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
                              : "space-y-3 sm:space-y-4"
                          )}>
                            {filteredNotifications.map((notification) => (
                              <NotificationCard
                                key={notification.id}
                                notification={notification}
                                viewMode={viewMode}
                                onClick={() => handleNotificationClick(notification)}
                              />
                            ))}
                          </div>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </TabsContent>
                ))}
                </div>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
