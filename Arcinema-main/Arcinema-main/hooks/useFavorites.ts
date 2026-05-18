import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, doc, setDoc, deleteDoc, query, where, getDocs } from 'firebase/firestore';
import { projectFirestore } from '@/firebase/config';

export interface FavoriteItem {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string;
  media_type: 'movie' | 'tv' | 'person' | 'anime';
  vote_average?: number;
  overview?: string;
  addedAt: Date;
}

export const useFavorites = () => {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load favorites from Firestore
  const loadFavorites = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const q = query(
        collection(projectFirestore, 'favorites'),
        where('userId', '==', user.uid)
      );
      const querySnapshot = await getDocs(q);
      const items: FavoriteItem[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        items.push({
          ...data,
          addedAt: data.addedAt?.toDate() || new Date()
        } as FavoriteItem);
      });
      
      setFavorites(items.sort((a, b) => b.addedAt.getTime() - a.addedAt.getTime()));
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  };

  // Add item to favorites
  const addToFavorites = async (item: Omit<FavoriteItem, 'addedAt'>) => {
    if (!user) return false;
    
    try {
      const docRef = doc(projectFirestore, 'favorites', `${user.uid}_${item.media_type}_${item.id}`);
      const favoriteItem = {
        ...item,
        userId: user.uid,
        addedAt: new Date()
      };
      
      await setDoc(docRef, favoriteItem);
      setFavorites(prev => [favoriteItem, ...prev]);
      return true;
    } catch (error) {
      return false;
    }
  };

  // Remove item from favorites
  const removeFromFavorites = async (itemId: number, mediaType: 'movie' | 'tv' | 'person' | 'anime') => {
    if (!user) return false;
    
    try {
      const docRef = doc(projectFirestore, 'favorites', `${user.uid}_${mediaType}_${itemId}`);
      await deleteDoc(docRef);
      setFavorites(prev => prev.filter(item => !(item.id === itemId && item.media_type === mediaType)));
      return true;
    } catch (error) {
      return false;
    }
  };

  // Check if item is in favorites
  const isFavorite = (itemId: number, mediaType: 'movie' | 'tv' | 'person' | 'anime') => {
    return favorites.some(item => item.id === itemId && item.media_type === mediaType);
  };

  // Toggle favorite status
  const toggleFavorite = async (item: Omit<FavoriteItem, 'addedAt'>) => {
    const isCurrentlyFavorite = isFavorite(item.id, item.media_type);
    
    if (isCurrentlyFavorite) {
      return await removeFromFavorites(item.id, item.media_type);
    } else {
      return await addToFavorites(item);
    }
  };

  useEffect(() => {
    if (user) {
      loadFavorites();
    } else {
      setFavorites([]);
    }
  }, [user]);

  return {
    favorites,
    isLoading,
    addToFavorites,
    removeFromFavorites,
    isFavorite,
    toggleFavorite,
    refreshFavorites: loadFavorites
  };
};
