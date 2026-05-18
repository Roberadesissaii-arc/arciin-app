import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, doc, setDoc, deleteDoc, query, where, getDocs } from 'firebase/firestore';
import { projectFirestore } from '@/firebase/config';

export interface WatchlistItem {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string;
  media_type: 'movie' | 'tv' | 'person' | 'anime';
  vote_average?: number;
  overview?: string;
  addedAt: Date;
}

export const useWatchlist = () => {
  const { user } = useAuth();
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load watchlist from Firestore
  const loadWatchlist = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const q = query(
        collection(projectFirestore, 'watchlists'),
        where('userId', '==', user.uid)
      );
      const querySnapshot = await getDocs(q);
      const items: WatchlistItem[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        items.push({
          ...data,
          addedAt: data.addedAt?.toDate() || new Date()
        } as WatchlistItem);
      });
      
      setWatchlist(items.sort((a, b) => b.addedAt.getTime() - a.addedAt.getTime()));
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  };

  // Add item to watchlist
  const addToWatchlist = async (item: Omit<WatchlistItem, 'addedAt'>) => {
    if (!user) return false;
    
    try {
      const docRef = doc(projectFirestore, 'watchlists', `${user.uid}_${item.media_type}_${item.id}`);
      const watchlistItem = {
        ...item,
        userId: user.uid,
        addedAt: new Date()
      };
      
      await setDoc(docRef, watchlistItem);
      setWatchlist(prev => [watchlistItem, ...prev]);
      return true;
    } catch (error) {
      return false;
    }
  };

  // Remove item from watchlist
  const removeFromWatchlist = async (itemId: number, mediaType: 'movie' | 'tv' | 'person' | 'anime') => {
    if (!user) return false;
    
    try {
      const docRef = doc(projectFirestore, 'watchlists', `${user.uid}_${mediaType}_${itemId}`);
      await deleteDoc(docRef);
      setWatchlist(prev => prev.filter(item => !(item.id === itemId && item.media_type === mediaType)));
      return true;
    } catch (error) {
      return false;
    }
  };

  // Check if item is in watchlist
  const isInWatchlist = (itemId: number, mediaType: 'movie' | 'tv' | 'person' | 'anime') => {
    return watchlist.some(item => item.id === itemId && item.media_type === mediaType);
  };

  // Toggle watchlist status
  const toggleWatchlist = async (item: Omit<WatchlistItem, 'addedAt'>) => {
    const inWatchlist = isInWatchlist(item.id, item.media_type);
    
    if (inWatchlist) {
      return await removeFromWatchlist(item.id, item.media_type);
    } else {
      return await addToWatchlist(item);
    }
  };

  useEffect(() => {
    if (user) {
      loadWatchlist();
    } else {
      setWatchlist([]);
    }
  }, [user]);

  return {
    watchlist,
    isLoading,
    addToWatchlist,
    removeFromWatchlist,
    isInWatchlist,
    toggleWatchlist,
    refreshWatchlist: loadWatchlist
  };
};
