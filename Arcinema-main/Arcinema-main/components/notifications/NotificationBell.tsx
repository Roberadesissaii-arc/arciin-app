// components/notifications/NotificationBell.tsx
"use client";

import { useState } from 'react';
import { Bell, X, Check, ExternalLink, Folder } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface NotificationBellProps {
  className?: string;
}

export default function NotificationBell({ className }: NotificationBellProps) {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const handleNotificationClick = async (notification: any) => {
    // Add a small delay before marking as read to allow user to see the action
    setTimeout(async () => {
      if (!notification.isRead) {
        await markAsRead(notification.id);
      }
    }, 150);
    
    // For folder notifications, go to shared folders page
    if (notification.type === 'folder_share' || notification.type === 'collaborative_folder') {
      router.push('/user/shared-folders');
      setIsOpen(false);
      return;
    }
    
    if (notification.movieData?.id) {
      router.push(`/movies/${notification.movieData.id}`);
    } else if (notification.tvShowData?.id) {
      router.push(`/tv-shows/${notification.tvShowData.id}`);
    }
    
    setIsOpen(false);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  return (
    <div className="relative">
      {/* Clickable badge that goes to notifications page */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => router.push('/notifications')}
        className={cn(
          "relative hover:bg-white/10 transition-colors p-2 rounded-full mr-2",
          className
        )}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        )}
      </Button>

      {/* Dropdown menu trigger */}
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-gray-400 hover:text-white hover:bg-white/10 px-2 py-1"
          >
            ▼
          </Button>
        </DropdownMenuTrigger>

      <DropdownMenuContent 
        align="end" 
        className="w-80 max-h-96 overflow-hidden bg-black/95 backdrop-blur-sm border border-white/10 rounded-2xl"
        sideOffset={8}
      >
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-gray-400 hover:text-white hover:bg-white/10"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Mark all read
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-6 w-6 hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {unreadCount > 0 && (
            <p className="text-xs text-gray-400 mt-1">
              {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto"></div>
              <p className="text-xs text-gray-400 mt-2">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-6 text-center">
              <Bell className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-400 text-sm mb-2">No notifications in dropdown</p>
              {unreadCount > 0 ? (
                <div className="bg-yellow-900/20 border border-yellow-600/30 rounded p-3 mb-3">
                  <p className="text-yellow-400 text-xs mb-2">
                    🔍 Found {unreadCount} notifications but they're not showing here.
                  </p>
                  <p className="text-yellow-300 text-xs">
                    Click "View All Notifications" below to see them.
                  </p>
                </div>
              ) : (
                <p className="text-gray-500 text-xs mb-3">
                  We'll notify you about new releases and updates
                </p>
              )}
            </div>
          ) : (
            <div className="py-2">
              {notifications.map((notification) => {
                const isFolderNotification = notification.type === 'folder_share' || notification.type === 'collaborative_folder';
                // For folder notifications, use movieData or tvShowData for poster
                const firstMovie = isFolderNotification ? (notification.movieData || notification.tvShowData) : null;
                
                return (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={cn(
                      "flex items-start gap-3 p-3 hover:bg-white/5 cursor-pointer transition-colors",
                      !notification.isRead && "bg-blue-500/10"
                    )}
                  >
                    <div className="relative w-12 h-16 flex-shrink-0">
                      {isFolderNotification && firstMovie?.poster_path ? (
                        <>
                          <Image
                            src={`https://image.tmdb.org/t/p/w92${firstMovie.poster_path}`}
                            alt={('title' in firstMovie ? firstMovie.title : firstMovie.name) || 'Movie'}
                            fill
                            className="object-cover rounded"
                          />
                          {/* Folder icon overlay */}
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full flex items-center justify-center border-2 border-black">
                            <Folder className="w-3 h-3 text-white" />
                          </div>
                        </>
                      ) : isFolderNotification ? (
                        <div className="w-full h-full bg-gradient-to-br from-indigo-500/90 via-indigo-600/90 to-indigo-700/90 rounded flex items-center justify-center">
                          <Folder className="w-6 h-6 text-white/80 drop-shadow-lg" />
                        </div>
                      ) : notification.movieData?.poster_path || notification.tvShowData?.poster_path ? (
                        <Image
                          src={`https://image.tmdb.org/t/p/w92${notification.movieData?.poster_path || notification.tvShowData?.poster_path}`}
                          alt={notification.movieData?.title || notification.tvShowData?.name || 'Movie'}
                          fill
                          className="object-cover rounded"
                        />
                      ) : (
                        <div className="w-12 h-16 bg-gray-700 rounded flex items-center justify-center flex-shrink-0">
                          <Bell className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <h4 className={cn(
                          "text-sm font-medium",
                          notification.isRead ? "text-gray-300" : "text-white"
                        )}>
                          {notification.title}
                        </h4>
                        <div className="flex items-center gap-1 ml-2">
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                          {(notification.movieData?.id || notification.tvShowData?.id || isFolderNotification) && (
                            <ExternalLink className="w-3 h-3 text-gray-400" />
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                        {notification.message || 'No message'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {notification.createdAt ? (
                          <>
                            {new Date(notification.createdAt).toLocaleDateString()} at{' '}
                            {new Date(notification.createdAt).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </>
                        ) : (
                          'No date available'
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Always show "View All Notifications" button */}
        <div className="p-3 border-t border-white/10 text-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-gray-400 hover:text-white hover:bg-white/10 w-full"
            onClick={() => {
              setIsOpen(false);
              router.push('/notifications');
            }}
          >
            View All Notifications ({unreadCount} unread)
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
  );
}
