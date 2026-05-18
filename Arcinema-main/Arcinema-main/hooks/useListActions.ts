// hooks/useListActions.ts
import { useCallback } from 'react';
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc, setDoc } from 'firebase/firestore';
import { projectFirestore } from '@/firebase/config';
import type { SavedMedia, UserList } from '@/types/user';

export const useListActions = () => {
  const addToList = useCallback(async (
    userId: string,
    listName: keyof UserList,
    media: SavedMedia
  ) => {
    try {
      const userRef = doc(projectFirestore, 'users', userId);
      
      // Check if user document exists and has the required structure
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        // Create user document with default structure
        await setDoc(userRef, {
          watchlist: [],
          favorites: [],
          watched: [],
          wantToWatch: [],
          recentlyViewed: [],
          activities: [],
          [listName]: [{
            ...media,
            addedAt: new Date().toISOString()
          }],
          createdAt: new Date(),
        });
      } else {
        // Document exists, check if it has the list field
        const userData = userDoc.data();
        const currentList = userData[listName] || [];
        
        // Check if item already exists
        const exists = currentList.some((item: SavedMedia) => item.id === media.id);
        
        if (!exists) {
          await updateDoc(userRef, {
            [listName]: arrayUnion({
              ...media,
              addedAt: new Date().toISOString()
            })
          });
        } else {
        }
      }
    } catch (error) {
      throw error;
    }
  }, []);

  const removeFromList = useCallback(async (
    userId: string,
    listName: keyof UserList,
    mediaId: number
  ) => {
    try {
      const userRef = doc(projectFirestore, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        return;
      }
      
      const list = userDoc.data()?.[listName] || [];
      const itemToRemove = list.find((item: SavedMedia) => item.id === mediaId);
      
      if (itemToRemove) {
        await updateDoc(userRef, {
          [listName]: arrayRemove(itemToRemove)
        });
      } else {
      }
    } catch (error) {
      throw error;
    }
  }, []);

  const moveToList = useCallback(async (
    userId: string,
    fromList: keyof UserList,
    toList: keyof UserList,
    media: SavedMedia
  ) => {
    await removeFromList(userId, fromList, media.id);
    await addToList(userId, toList, media);
  }, [addToList, removeFromList]);

  const isInList = useCallback(async (
    userId: string,
    listName: keyof UserList,
    mediaId: number
  ) => {
    try {
      const userRef = doc(projectFirestore, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        return false;
      }
      
      const list = userDoc.data()?.[listName] || [];
      return list.some((item: SavedMedia) => item.id === mediaId);
    } catch (error) {
      return false;
    }
  }, []);

  return {
    addToList,
    removeFromList,
    moveToList,
    isInList
  };
};