// hooks/useActivityTracking.ts
import { useCallback } from 'react';
import { doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { projectFirestore } from '@/firebase/config';
import { useAuth } from '@/contexts/AuthContext';

export interface UserActivity {
  id: string;
  type: 'search' | 'view' | 'add_to_list' | 'rate';
  mediaId?: number;
  mediaTitle?: string;
  mediaType?: 'movie' | 'tv' | 'anime';
  searchQuery?: string;
  listType?: 'watchlist' | 'favorites' | 'watched';
  timestamp: Date;
  metadata?: Record<string, any>;
}

export const useActivityTracking = () => {
  const { user } = useAuth();

  const trackActivity = useCallback(async (activity: Omit<UserActivity, 'id' | 'timestamp'>) => {
    if (!user) return;

    try {
      // Check for duplicates within the last 10 minutes
      const userDoc = await getDoc(doc(projectFirestore, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const activities = userData.activities || [];
        
        const tenMinutesAgo = new Date();
        tenMinutesAgo.setMinutes(tenMinutesAgo.getMinutes() - 10);
        
        const isDuplicate = activities.some((existingActivity: UserActivity) => {
          const activityDate = existingActivity.timestamp instanceof Date 
            ? existingActivity.timestamp 
            : new Date(existingActivity.timestamp);
          
          if (activityDate <= tenMinutesAgo) return false;
          
          // Check if it's the same type of activity
          if (existingActivity.type !== activity.type) return false;
          
          // For search activities, check query
          if (activity.type === 'search') {
            return existingActivity.searchQuery === activity.searchQuery;
          }
          
          // For media-related activities, check mediaId and type
          if (activity.type === 'view' || activity.type === 'add_to_list' || activity.type === 'rate') {
            return existingActivity.mediaId === activity.mediaId && 
                   existingActivity.mediaType === activity.mediaType &&
                   (activity.type !== 'add_to_list' || existingActivity.listType === activity.listType);
          }
          
          return false;
        });
        
        // Only track if no duplicate found
        if (!isDuplicate) {
          const activityWithMetadata: UserActivity = {
            ...activity,
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
          };

          await updateDoc(doc(projectFirestore, 'users', user.uid), {
            activities: arrayUnion(activityWithMetadata)
          });
        }
      } else {
        // If no user doc exists yet, track the activity
        const activityWithMetadata: UserActivity = {
          ...activity,
          id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date(),
        };

        await updateDoc(doc(projectFirestore, 'users', user.uid), {
          activities: arrayUnion(activityWithMetadata)
        });
      }
    } catch (error) {
    }
  }, [user]);

  const cleanupOldActivities = useCallback(async () => {
    if (!user) return;

    try {
      const userDoc = await getDoc(doc(projectFirestore, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const activities = userData.activities || [];
        
        // Keep only activities from the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const recentActivities = activities.filter((activity: UserActivity) => {
          const activityDate = activity.timestamp instanceof Date 
            ? activity.timestamp 
            : new Date(activity.timestamp);
          return activityDate > thirtyDaysAgo;
        });

        if (recentActivities.length !== activities.length) {
          await updateDoc(doc(projectFirestore, 'users', user.uid), {
            activities: recentActivities
          });
        }
      }
    } catch (error) {
    }
  }, [user]);

  const trackSearch = useCallback(async (query: string) => {
    trackActivity({
      type: 'search',
      searchQuery: query
    });
  }, [trackActivity]);

  const trackMediaView = useCallback((mediaId: number, mediaTitle: string, mediaType: 'movie' | 'tv' | 'anime') => {
    trackActivity({
      type: 'view',
      mediaId,
      mediaTitle,
      mediaType
    });
  }, [trackActivity]);

  const trackListAction = useCallback((mediaId: number, mediaTitle: string, mediaType: 'movie' | 'tv' | 'anime', listType: 'watchlist' | 'favorites' | 'watched') => {
    trackActivity({
      type: 'add_to_list',
      mediaId,
      mediaTitle,
      mediaType,
      listType
    });
  }, [trackActivity]);

  return {
    trackActivity,
    trackSearch,
    trackMediaView,
    trackListAction,
    cleanupOldActivities
  };
};
