// app/profile/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import { usePendingFolderInvites } from "@/hooks/usePendingFolderInvites";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, getStorage } from 'firebase/storage';
import { projectFirestore as db } from '@/firebase/config';
import { getAvatarPath, getAvatarName, type ProfileAvatar } from '@/lib/utils/profileAvatars';
import AvatarSelector from '@/components/user/AvatarSelector';
import { 
  Camera, 
  Loader2, 
  Calendar, 
  Mail, 
  Heart,
  Eye,
  Clock,
  Award,
  Film,
  TrendingUp,
  Settings,
  ChevronRight,
  Smartphone,
  Monitor,
  Tablet,
  MapPin,
  Chrome,
  Play,
  LogOut,
  X,
  BadgeCheck,
  Folder,
  Bell
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DeviceInfo {
  id: string;
  type: 'mobile' | 'desktop' | 'tablet';
  browser: string;
  os: string;
  lastAccess: Date;
  location?: string;
}

interface ProfileData {
  photoURL?: string;
  displayName?: string;
  email?: string;
  username?: string;
  avatarId?: string;
  avatarName?: string;
  createdAt?: any;
  updatedAt?: any;
  watchlist?: any[];
  favorites?: any[];
  watched?: any[];
  wantToWatch?: any[];
  recentlyViewed?: any[];
  following?: any[];
  devices?: DeviceInfo[];
}

export default function UserProfile() {
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const { count: pendingFolderInvitesCount } = usePendingFolderInvites();
  const router = useRouter();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [deviceToLogout, setDeviceToLogout] = useState<string | null>(null);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [heroMovies, setHeroMovies] = useState<any[]>([]);
  
  // Device detection function
  const getDeviceInfo = (): DeviceInfo => {
    const userAgent = navigator.userAgent.toLowerCase();
    const deviceId = localStorage.getItem('deviceId') || `device_${Date.now()}_${Math.random()}`;
    localStorage.setItem('deviceId', deviceId);

    // Better device type detection
    let deviceType: 'mobile' | 'desktop' | 'tablet' = 'desktop';
    const isMobile = /android|webos|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    const isTablet = /ipad|android(?!.*mobile)|tablet/i.test(userAgent);
    
    if (isTablet) {
      deviceType = 'tablet';
    } else if (isMobile) {
      deviceType = 'mobile';
    }

    // Better browser detection
    let browser = 'Unknown';
    if (userAgent.includes('edg')) browser = 'Edge';
    else if (userAgent.includes('chrome') && !userAgent.includes('edg')) browser = 'Chrome';
    else if (userAgent.includes('firefox')) browser = 'Firefox';
    else if (userAgent.includes('safari') && !userAgent.includes('chrome')) browser = 'Safari';
    else if (userAgent.includes('opera') || userAgent.includes('opr')) browser = 'Opera';

    // Better OS detection
    let os = 'Unknown';
    if (userAgent.includes('windows')) os = 'Windows';
    else if (userAgent.includes('mac os x') || userAgent.includes('macos')) os = 'macOS';
    else if (userAgent.includes('linux')) os = 'Linux';
    else if (userAgent.includes('android')) os = 'Android';
    else if (userAgent.includes('iphone') || userAgent.includes('ipad') || userAgent.includes('ipod')) os = 'iOS';

    return {
      id: deviceId,
      type: deviceType,
      browser,
      os,
      lastAccess: new Date(),
    };
  };

  // Track device on mount and when user changes
  useEffect(() => {
    const trackDevice = async () => {
      if (!user) return;

      try {
        const currentDevice = getDeviceInfo();
        const userRef = doc(db, 'users', user.uid);
        
        // Get current user data
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const data = userDoc.data();
          const existingDevices = (data.devices || []) as DeviceInfo[];
          
          // Update or add current device
          const deviceIndex = existingDevices.findIndex((d: DeviceInfo) => d.id === currentDevice.id);
          
          let updatedDevices;
          if (deviceIndex >= 0) {
            // Update existing device
            existingDevices[deviceIndex] = {
              ...existingDevices[deviceIndex],
              ...currentDevice,
              lastAccess: new Date(),
            };
            updatedDevices = existingDevices;
          } else {
            // Add new device (don't logout, just add it)
            updatedDevices = [...existingDevices, currentDevice];
          }

          // Sort by last access and keep only last 10 devices
          const recentDevices = updatedDevices
            .sort((a: DeviceInfo, b: DeviceInfo) => 
              new Date(b.lastAccess).getTime() - new Date(a.lastAccess).getTime()
            )
            .slice(0, 10);

          await updateDoc(userRef, {
            devices: recentDevices,
            lastSignInTime: new Date(),
          });

          // Update local state immediately
          setProfileData(prev => ({
            ...prev,
            devices: recentDevices,
          }));
        } else {
          // Create user document if it doesn't exist
          await setDoc(userRef, {
            devices: [currentDevice],
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            createdAt: new Date(),
            lastSignInTime: new Date(),
          });
          
          setProfileData({
            devices: [currentDevice],
            email: user.email || undefined,
            displayName: user.displayName || undefined,
            photoURL: user.photoURL || undefined,
          });
        }
      } catch (error) {
      }
    };

    trackDevice();
    
    // Set up interval to update device activity every 30 seconds
    const interval = setInterval(() => {
      if (user) {
        trackDevice();
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [user]);

  // Logout from specific device
  const handleLogoutDevice = async (deviceId: string) => {
    setDeviceToLogout(deviceId);
    setShowLogoutDialog(true);
  };

  const confirmLogoutDevice = async () => {
    if (!user || !profileData?.devices || !deviceToLogout) return;

    try {
      const updatedDevices = profileData.devices.filter(d => d.id !== deviceToLogout);
      const userRef = doc(db, 'users', user.uid);
      
      // Mark device as explicitly logged out
      await updateDoc(userRef, {
        devices: updatedDevices,
        loggedOutDevices: [...(profileData?.devices || [])
          .filter(d => d.id === deviceToLogout)
          .map(d => ({ id: d.id, loggedOutAt: new Date() }))
        ]
      });

      setProfileData(prev => ({
        ...prev,
        devices: updatedDevices,
      }));

      setShowLogoutDialog(false);
      setDeviceToLogout(null);

      toast({
        title: "Device Removed",
        description: "Device has been logged out successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove device",
        variant: "destructive",
      });
    }
  };
  
  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setProfileData(userDoc.data() as ProfileData);
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load profile data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [user, toast]);

  // Fetch trending movies as fallback for hero background
  useEffect(() => {
    const fetchHeroMovies = async () => {
      try {
        const response = await fetch(
          `https://api.themoviedb.org/3/trending/movie/day?language=en-US`,
          {
            headers: {
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_TMDB_API_READ_ACCESS_TOKEN}`,
            },
          }
        );
        const data = await response.json();
        setHeroMovies(data.results.slice(0, 12));
      } catch (error) {
      }
    };

    fetchHeroMovies();
  }, []);

  const handleAvatarSelect = (avatar: ProfileAvatar) => {
    // Update local state immediately
    setProfileData(prev => ({
      ...prev,
      avatarId: avatar.id,
      avatarName: avatar.name,
    }));
  };

  if (!user) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white/80" />
      </div>
    );
  }

  const stats = [
    {
      label: 'Watchlist',
      value: profileData?.watchlist?.length || 0,
      icon: Clock,
      href: '/user/my-list'
    },
    {
      label: 'Favorites',
      value: profileData?.favorites?.length || 0,
      icon: Heart,
      href: '/user/likes'
    },
    {
      label: 'Watched',
      value: profileData?.watched?.length || 0,
      icon: Eye,
      href: '/user/watch-history'
    },
    {
      label: 'Want to Watch',
      value: profileData?.wantToWatch?.length || 0,
      icon: Award,
      href: '/user/my-list'
    }
  ];

  const quickLinks = [
    { label: 'My Lists', icon: Film, href: '/user/my-list' },
    { label: 'Shared Folders', icon: Folder, href: '/user/shared-folders' },
    { label: 'Notifications', icon: Bell, href: '/notifications' },
    { label: 'Activity', icon: TrendingUp, href: '/user/activity' },
    { label: 'Settings', icon: Settings, href: '/user/settings' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white/80" />
      </div>
    );
  }

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'mobile': return Smartphone;
      case 'tablet': return Tablet;
      default: return Monitor;
    }
  };

  return (
    <div className="min-h-screen pb-12 bg-zinc-950">
      {/* Hero Section with User's Content Background */}
      <div className="relative min-h-[45vh] flex flex-col justify-end -mt-24 pt-24 mb-4">
        {/* Background Grid - User's Watchlist/Favorites */}
        <div className="absolute inset-0 -top-24 opacity-30">
          <div className="grid grid-cols-6 gap-2 h-full p-4 pt-28">
            {(() => {
              // First try to get user's content
              const allItems = [
                ...(profileData?.watchlist || []),
                ...(profileData?.favorites || []),
                ...(profileData?.watched || []),
                ...(profileData?.wantToWatch || [])
              ].filter((item, index, self) => 
                item?.poster_path && self.findIndex(i => i.id === item.id) === index
              ).slice(0, 12);

              // If no user content, use trending movies as fallback
              const displayItems = allItems.length > 0 ? allItems : heroMovies;

              if (displayItems.length === 0) {
                return <div className="w-full h-full bg-gradient-to-br from-indigo-900/20 to-purple-900/20" />;
              }

              return displayItems.map((item, index) => (
                <div key={index} className="relative aspect-[2/3] bg-gray-900 overflow-hidden rounded-lg">
                  <img
                    src={`https://image.tmdb.org/t/p/w342${item.poster_path}`}
                    alt={item.title || item.name || ''}
                    className="w-full h-full object-cover"
                  />
                </div>
              ));
            })()}
          </div>
        </div>

        {/* Page Header Content - Left aligned and pushed down */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 px-4 pb-4 pt-20 max-w-6xl mx-auto w-full"
        >
          <h1 className="text-5xl font-bold mb-3 text-left text-white drop-shadow-lg">Your Profile</h1>
          <p className="text-lg text-gray-300 text-left drop-shadow-lg">Manage your account and preferences</p>
        </motion.div>
      </div>

      <div className="max-w-6xl mx-auto px-4">

        {/* Profile Card - Mobile Style */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center gap-4 p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <Avatar className="w-24 h-24 rounded-2xl border-2 border-white/10">
                <AvatarImage
                  src={getAvatarPath(profileData?.avatarId)}
                  alt={getAvatarName(profileData?.avatarId)}
                  className="object-cover"
                />
                <AvatarFallback className="bg-gradient-to-br from-gray-700 to-gray-800 text-3xl font-bold rounded-2xl">
                  {user.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>

              {/* Camera Button */}
              <button
                onClick={() => setShowAvatarSelector(true)}
                className="absolute -bottom-1 -right-1 bg-white rounded-xl p-2.5 shadow-lg hover:scale-105 active:scale-95 transition-transform"
                aria-label="Change avatar"
              >
                <Camera className="w-4 h-4 text-black" />
              </button>
            </div>

            {/* User Info */}
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold text-white mb-1 truncate flex items-center gap-2">
                <span className="truncate">
                  {(user.displayName || 'User').length > 8 
                    ? `${(user.displayName || 'User').substring(0, 8)}...` 
                    : (user.displayName || 'User')
                  }
                </span>
                <BadgeCheck className="w-6 h-6 text-blue-500 flex-shrink-0" />
              </h2>
              <p className="text-sm text-gray-400 mb-1.5 flex items-center gap-2 truncate">
                <Mail className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{user.email}</span>
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Joined {user.metadata.creationTime 
                  ? new Date(user.metadata.creationTime).toLocaleDateString('en-US', { 
                      month: 'short', 
                      year: 'numeric' 
                    })
                  : 'Recently'
                }</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid - Mobile Style */}
        <div className="mb-6">
          <div className="grid grid-cols-4 gap-3">
            {stats.map((stat, index) => (
              <motion.button
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => router.push(stat.href)}
                className="group relative overflow-hidden rounded-2xl p-5 bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition-all"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                  <div className="text-xs text-gray-400 font-medium leading-tight">{stat.label}</div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Quick Access - Mobile Style */}
        <div className="mb-6">
          <div className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 overflow-hidden divide-y divide-white/10">
            {quickLinks.map((link, index) => {
              const isNotifications = link.label === 'Notifications';
              const isSharedFolders = link.label === 'Shared Folders';
              const showNotificationBadge = isNotifications && unreadCount > 0;
              const showFolderBadge = isSharedFolders && pendingFolderInvitesCount > 0;
              
              return (
                <motion.button
                  key={link.label}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.05 }}
                  onClick={() => router.push(link.href)}
                  className="group w-full flex items-center justify-between px-6 py-4 hover:bg-white/5 transition-colors relative"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center relative">
                      <link.icon className="w-4 h-4 text-indigo-400" />
                      {showNotificationBadge && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-red-600 via-red-500 to-red-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                      {showFolderBadge && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-red-600 via-red-500 to-red-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                          {pendingFolderInvitesCount > 99 ? '99+' : pendingFolderInvitesCount}
                        </span>
                      )}
                    </div>
                    <span className="text-[15px] font-medium text-white">{link.label}</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-gray-400 transition-colors" />
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Devices Section - Mobile Style */}
        {profileData?.devices && profileData.devices.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold mb-3 text-gray-400 uppercase tracking-wide px-1">
              Active Devices
            </h3>
            <div className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 overflow-hidden divide-y divide-white/10">
              {profileData.devices.map((device, index) => {
                const DeviceIcon = getDeviceIcon(device.type);
                const isCurrentDevice = device.id === localStorage.getItem('deviceId');
                return (
                  <motion.div
                    key={device.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="relative flex items-center gap-4 px-6 py-4"
                  >
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                      <DeviceIcon className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium text-white capitalize text-sm">{device.type}</span>
                        {isCurrentDevice && (
                          <span className="px-2 py-0.5 text-[10px] rounded-md bg-indigo-500/20 text-indigo-400 font-medium">
                            This Device
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {device.browser} • {new Date(device.lastAccess).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                    {!isCurrentDevice && (
                      <button
                        onClick={() => handleLogoutDevice(device.id)}
                        className="p-2 rounded-lg hover:bg-white/5 text-gray-500 hover:text-gray-400 transition-colors"
                        title="Logout this device"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Account Info - Mobile Style */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-3 text-gray-400 uppercase tracking-wide px-1">
            Account
          </h3>
          <div className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 overflow-hidden divide-y divide-white/10">
            <div className="flex items-center justify-between px-6 py-4">
              <span className="text-sm text-gray-400">Email</span>
              <span className="text-sm font-medium text-white">{user.email}</span>
            </div>
            <div className="flex items-center justify-between px-6 py-4">
              <span className="text-sm text-gray-400">Member Since</span>
              <span className="text-sm font-medium text-white">
                {user.metadata.creationTime 
                  ? new Date(user.metadata.creationTime).toLocaleDateString('en-US', {
                      month: 'short',
                      year: 'numeric'
                    })
                  : 'Unknown'
                }
              </span>
            </div>
            <div className="flex items-center justify-between px-6 py-4">
              <span className="text-sm text-gray-400">Status</span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm font-medium text-green-400">Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Logout Device Confirmation Dialog */}
        {showLogoutDialog && (
          <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={() => setShowLogoutDialog(false)}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            
            {/* Dialog */}
            <div 
              className="relative bg-black/40 backdrop-blur-xl border border-white/20 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => setShowLogoutDialog(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                title="Close"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Content */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-white">
                  Logout Device?
                </h3>
                
                <p className="text-gray-300 leading-relaxed">
                  Are you sure you want to logout this device? This will remove the device from your active sessions.
                </p>

                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                  <p className="text-sm text-yellow-200">
                    <strong>Note:</strong> If someone is currently using this device, they will need to sign in again.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowLogoutDialog(false);
                      setDeviceToLogout(null);
                    }}
                    className="flex-1 bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={confirmLogoutDevice}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  >
                    Logout Device
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Avatar Selector Dialog */}
        {showAvatarSelector && user && (
          <AvatarSelector
            userId={user.uid}
            currentAvatarId={profileData?.avatarId}
            onClose={() => setShowAvatarSelector(false)}
            onSelect={handleAvatarSelect}
          />
        )}
      </div>
    </div>
  );
}