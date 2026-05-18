"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { 
  MessageSquare, 
  Plus, 
  X,
  PanelLeftClose,
  Search,
  UserCircle,
  Settings,
  LogOut,
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getAvatarPath } from '@/lib/utils/profileAvatars';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  doc,
  getDoc,
  Timestamp
} from 'firebase/firestore';
import { projectFirestore, projectAuth } from '@/firebase/config';

interface Conversation {
  id: string;
  userId: string;
  userDisplayName: string;
  userUsername: string;
  userAvatarId?: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
}

interface MessagesSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  currentUserId?: string | null;
  onSelectConversation: (userId: string) => void;
  isLoading?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const getInitials = (name: string): string => {
  if (!name) return 'U';
  const parts = name.split(' ').filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

export function MessagesSidebar({ 
  isOpen, 
  onToggle, 
  onClose,
  currentUserId,
  onSelectConversation,
  isLoading = false,
  isCollapsed = false,
  onToggleCollapse
}: MessagesSidebarProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [avatarId, setAvatarId] = useState<string | undefined>();
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Fetch user's avatar
  useEffect(() => {
    if (!user?.uid) return;

    const userDocRef = doc(projectFirestore, 'users', user.uid);
    const unsubscribe = onSnapshot(userDocRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        if (data.avatarId) {
          setAvatarId(data.avatarId);
        }
      }
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // Load conversations
  useEffect(() => {
    if (!user?.uid) return;

    // Get all messages where user is sender or receiver, ordered by timestamp
    const messagesQuery = query(
      collection(projectFirestore, 'messages'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(messagesQuery, async (snapshot) => {
      const conversationMap = new Map<string, Conversation>();
      const userConversations = new Set<string>();
      
      // First pass: collect all conversation IDs the user is part of
      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.senderId === user.uid || data.receiverId === user.uid) {
          if (data.conversationId) {
            userConversations.add(data.conversationId);
          }
        }
      });
      
      // Second pass: process each conversation
      for (const conversationId of userConversations) {
        // Get the latest message for this conversation
        const conversationMessages = snapshot.docs
          .filter(doc => doc.data().conversationId === conversationId)
          .sort((a, b) => {
            const timeA = a.data().timestamp?.toDate() || new Date(0);
            const timeB = b.data().timestamp?.toDate() || new Date(0);
            return timeB.getTime() - timeA.getTime();
          });
        
        if (conversationMessages.length === 0) continue;
        
        const latestMessage = conversationMessages[0].data();
        
        // Extract user IDs from conversation ID
        const [userId1, userId2] = conversationId.split('_');
        const otherUserId = userId1 === user.uid ? userId2 : userId1;
        
        if (otherUserId === user.uid) continue;
        
        // Get other user's info
        let otherUserData: any = null;
        try {
          const otherUserDoc = await getDoc(doc(projectFirestore, 'users', otherUserId));
          if (otherUserDoc.exists()) {
            otherUserData = otherUserDoc.data();
          }
        } catch (error) {
          console.error('Error fetching user:', error);
          continue;
        }
        
        if (!otherUserData) continue;
        
        // Count unread messages in this conversation
        const unreadCount = conversationMessages.filter(doc => {
          const msg = doc.data();
          return msg.receiverId === user.uid && !msg.read;
        }).length;
        
        conversationMap.set(otherUserId, {
          id: conversationId,
          userId: otherUserId,
          userDisplayName: otherUserData.displayName || otherUserData.username || 'User',
          userUsername: otherUserData.username || 'user',
          userAvatarId: otherUserData.avatarId,
          lastMessage: latestMessage.content || '',
          lastMessageTime: latestMessage.timestamp?.toDate() || new Date(),
          unreadCount
        });
      }
      
      const conversationsList = Array.from(conversationMap.values())
        .sort((a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime());
      
      setConversations(conversationsList);
    }, (error) => {
      console.error('Error loading conversations:', error);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // Handle click outside to collapse sidebar (desktop only)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (window.innerWidth >= 1024 && !isCollapsed && sidebarRef.current) {
        if (!sidebarRef.current.contains(event.target as Node)) {
          if (onToggleCollapse) {
            onToggleCollapse();
          }
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCollapsed, onToggleCollapse]);

  const handleLogout = async () => {
    try {
      await projectAuth.signOut();
      router.push('/auth/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      conv.userDisplayName.toLowerCase().includes(query) ||
      conv.userUsername.toLowerCase().includes(query) ||
      conv.lastMessage.toLowerCase().includes(query)
    );
  });

  const handleSearchClick = () => {
    if (isCollapsed) {
      if (onToggleCollapse) {
        onToggleCollapse();
      }
      setShowSearch(true);
    } else {
      setShowSearch(!showSearch);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop - Click to close (mobile only) */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-40 lg:hidden"
            onClick={onClose}
          />

          {/* Sidebar - Fixed position */}
          <motion.div
            ref={sidebarRef}
            initial={{ x: isCollapsed ? -64 : -320 }}
            animate={{ x: 0, width: isCollapsed ? 64 : 320 }}
            exit={{ x: isCollapsed ? -64 : -320 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={cn(
              "fixed left-4 top-4 bottom-4 bg-black/95 backdrop-blur-xl border border-gray-800/50 rounded-2xl z-[60] flex flex-col shadow-2xl",
              isCollapsed ? "w-16" : "w-80 sm:w-80 max-w-[85vw]"
            )}
          >
            {/* Collapsed View - Desktop Only */}
            {isCollapsed ? (
              <div className="hidden lg:flex flex-col items-center py-4 h-full">
                <button
                  onClick={() => {
                    if (onToggleCollapse) {
                      onToggleCollapse();
                      setShowSearch(false);
                    }
                  }}
                  className="mb-3 hover:opacity-80 transition-opacity"
                  title="Expand Sidebar"
                >
                  <span className="text-2xl font-galindo font-bold bg-gradient-to-r from-indigo-600 to-indigo-500 bg-clip-text text-transparent">
                    A
                  </span>
                </button>

                <div className="w-10 h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent mb-3" />

                <button
                  onClick={handleSearchClick}
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-indigo-500/10 transition-colors mb-3"
                  title="Search"
                >
                  <Search className="w-5 h-5" />
                </button>

                <div className="mt-auto pt-3 border-t border-gray-800/50 w-full flex justify-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-0 rounded-lg hover:bg-white/10 transition-colors">
                        <Avatar className="w-10 h-10 border-2 border-indigo-500">
                          <AvatarImage src={getAvatarPath(avatarId)} alt="Profile" />
                          <AvatarFallback className="bg-gradient-to-r from-indigo-600 to-indigo-500 text-sm">
                            {getInitials(user?.displayName || user?.email || "User")}
                          </AvatarFallback>
                        </Avatar>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      side="right"
                      align="end"
                      sideOffset={8}
                      className="w-48 bg-black/95 border-white/10 rounded-xl shadow-xl"
                    >
                      <div className="px-3 py-2">
                        <p className="text-sm font-medium text-white truncate">
                          {user?.displayName || user?.email?.split('@')[0] || 'User'}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {user?.email || ''}
                        </p>
                      </div>
                      <DropdownMenuSeparator className="bg-white/10" />
                      <DropdownMenuItem 
                        className="focus:bg-white/5 cursor-pointer"
                        onClick={() => router.push('/user/profile')}
                      >
                        <UserCircle className="w-4 h-4 mr-2" />
                        Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="focus:bg-white/5 cursor-pointer"
                        onClick={() => router.push('/user/settings')}
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Settings
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-white/10" />
                      <DropdownMenuItem 
                        className="focus:bg-white/5 cursor-pointer text-red-400"
                        onClick={handleLogout}
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Log out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ) : (
              <>
                {/* Full Sidebar View */}
                <div className="flex items-center justify-between p-4 border-b border-gray-800/50">
                  <div>
                    <h2 className="font-galindo text-lg bg-gradient-to-r from-indigo-600 to-indigo-500 bg-clip-text text-transparent">
                      Arcinema
                    </h2>
                    <p className="text-xs text-gray-400">Messages</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSearchClick}
                      className={cn(
                        "hidden lg:flex text-gray-400 hover:text-white hover:bg-indigo-500/10",
                        showSearch && "bg-indigo-500/10 text-white"
                      )}
                      title="Search"
                    >
                      <Search className="w-4 h-4" />
                    </Button>
                    {onToggleCollapse && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onToggleCollapse}
                        className="hidden lg:flex text-gray-400 hover:text-white hover:bg-indigo-500/10"
                        title="Collapse Sidebar"
                      >
                        <PanelLeftClose className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onClose}
                      className="lg:hidden text-gray-400 hover:text-white hover:bg-indigo-500/10"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Search Bar */}
                {showSearch && (
                  <div className="px-4 pt-4 pb-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search conversations..."
                        className="pl-10 bg-black/30 border-gray-700 text-white placeholder:text-gray-500 focus:border-indigo-500"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                          title="Clear search"
                          aria-label="Clear search"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Conversations List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide">
                  <AnimatePresence mode="popLayout">
                    {filteredConversations.map((conv) => (
                      <motion.div
                        key={conv.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={cn(
                          "group relative rounded-lg p-3 cursor-pointer transition-colors",
                          "hover:bg-indigo-500/10",
                          currentUserId === conv.userId 
                            ? "bg-indigo-500/15 border border-indigo-500/30" 
                            : "bg-black/30"
                        )}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onSelectConversation(conv.userId);
                          if (window.innerWidth < 1024) {
                            onClose();
                          } else if (onToggleCollapse && !isCollapsed) {
                            onToggleCollapse();
                          }
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <Avatar className="w-12 h-12 border-2 border-white/20 flex-shrink-0">
                            <AvatarImage src={getAvatarPath(conv.userAvatarId)} alt={conv.userDisplayName} />
                            <AvatarFallback className="bg-gradient-to-br from-indigo-500/30 to-purple-500/30 text-indigo-200 font-bold">
                              {getInitials(conv.userDisplayName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <h3 className="text-sm font-medium text-white truncate">
                                {conv.userDisplayName}
                              </h3>
                              {conv.unreadCount > 0 && (
                                <span className="flex-shrink-0 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                                  {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 truncate mb-1">
                              {conv.lastMessage}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDate(conv.lastMessageTime)}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {/* Empty State */}
                  {filteredConversations.length === 0 && !isLoading && (
                    <div className="text-center py-8">
                      {searchQuery ? (
                        <>
                          <Search className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                          <p className="text-gray-400 text-sm">No conversations found</p>
                          <p className="text-gray-500 text-xs">Try a different search term</p>
                        </>
                      ) : (
                        <>
                          <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                          <p className="text-gray-400 text-sm">No conversations yet</p>
                          <p className="text-gray-500 text-xs">Start a conversation!</p>
                        </>
                      )}
                    </div>
                  )}

                  {/* Loading State */}
                  {isLoading && (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse">
                          <div className="h-16 bg-black/20 rounded-lg" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Profile Section at Bottom */}
                <div className="p-4 border-t border-gray-800/50">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
                        <Avatar className="w-8 h-8 border-2 border-indigo-500 flex-shrink-0">
                          <AvatarImage src={getAvatarPath(avatarId)} alt="Profile" />
                          <AvatarFallback className="bg-gradient-to-r from-indigo-600 to-indigo-500 text-sm">
                            {getInitials(user?.displayName || user?.email || "User")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {user?.displayName || user?.email?.split('@')[0] || 'User'}
                          </p>
                          <p className="text-xs text-gray-400 truncate">
                            {user?.email || ''}
                          </p>
                        </div>
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      side="top"
                      align="start"
                      sideOffset={8}
                      className="w-56 bg-black/95 border-white/10 rounded-xl shadow-xl mb-2"
                    >
                      <div className="px-3 py-2">
                        <p className="text-sm font-medium text-white truncate">
                          {user?.displayName || user?.email?.split('@')[0] || 'User'}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                          {user?.email || ''}
                        </p>
                      </div>
                      <DropdownMenuSeparator className="bg-white/10" />
                      <DropdownMenuItem 
                        className="focus:bg-white/5 cursor-pointer"
                        onClick={() => router.push('/user/profile')}
                      >
                        <UserCircle className="w-4 h-4 mr-2" />
                        Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="focus:bg-white/5 cursor-pointer"
                        onClick={() => router.push('/user/settings')}
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Settings
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-white/10" />
                      <DropdownMenuItem 
                        className="focus:bg-white/5 cursor-pointer text-red-400"
                        onClick={handleLogout}
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Log out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

