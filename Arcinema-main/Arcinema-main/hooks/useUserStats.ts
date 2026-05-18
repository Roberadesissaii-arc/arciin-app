import { useState, useEffect } from 'react';
import { doc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import { projectFirestore } from '@/firebase/config';

interface UserStats {
  watchlistCount: number;
  reviewsCount: number;
  likesCount: number;
  foldersSharedCount: number;
  sharedWithUsers: string[];
  followingCount: number;
  followersCount: number;
  lastUpdated?: string;
}

export const useUserStats = (userId: string | undefined) => {
  const [stats, setStats] = useState<UserStats>({
    watchlistCount: 0,
    reviewsCount: 0,
    likesCount: 0,
    foldersSharedCount: 0,
    sharedWithUsers: [],
    followingCount: 0,
    followersCount: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    // Subscribe to user document for basic stats
    const unsubscribe = onSnapshot(
      doc(projectFirestore, 'users', userId),
      async (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          
          // Get folder sharing stats, following count, and followers count
          try {
            const [sharesSnapshot, followingSnapshot, followersSnapshot] = await Promise.all([
              getDocs(query(
                collection(projectFirestore, 'folderShareInvites'),
                where('fromUserId', '==', userId)
              )),
              getDocs(query(
                collection(projectFirestore, 'follows'),
                where('followerId', '==', userId)
              )),
              getDocs(query(
                collection(projectFirestore, 'follows'),
                where('followingId', '==', userId)
              ))
            ]);
            
            // Get unique users shared with
            const sharedWithSet = new Set<string>();
            sharesSnapshot.docs.forEach(doc => {
              const shareData = doc.data();
              sharedWithSet.add(shareData.toUserId);
            });
            
            setStats({
              watchlistCount: data.watchlist?.length || 0,
              reviewsCount: data.reviews?.length || 0,
              likesCount: data.favorites?.length || 0,
              foldersSharedCount: sharesSnapshot.size,
              sharedWithUsers: Array.from(sharedWithSet),
              followingCount: followingSnapshot.size,
              followersCount: followersSnapshot.size,
              lastUpdated: new Date().toISOString()
            });
          } catch (error) {
            setStats({
              watchlistCount: data.watchlist?.length || 0,
              reviewsCount: data.reviews?.length || 0,
              likesCount: data.favorites?.length || 0,
              foldersSharedCount: 0,
              sharedWithUsers: [],
              followingCount: 0,
              followersCount: 0,
              lastUpdated: new Date().toISOString()
            });
          }
        }
        setLoading(false);
      },
      (error) => {
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  return { stats, loading };
}; 