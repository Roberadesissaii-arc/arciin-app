/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/firebase/userUtils.ts
import { doc, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { projectFirestore as db } from '@/firebase/config';

export const getUserPreferences = async (userId: string) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    return userDoc.exists() ? userDoc.data() : null;
  } catch (error) {
    return null;
  }
};

export const toggleMediaInWatchlist = async (userId: string, media: any) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      await setDoc(userRef, {
        watchlist: [media],
        createdAt: new Date(),
      });
      return true;
    }

    const watchlist = userDoc.data().watchlist || [];
    const exists = watchlist.some((item: any) => item.id === media.id);

    await updateDoc(userRef, {
      watchlist: exists 
        ? arrayRemove(watchlist.find((item: any) => item.id === media.id))
        : arrayUnion({ ...media, addedAt: new Date() }),
      updatedAt: new Date(),
    });

    return !exists;
  } catch (error) {
    return false;
  }
};

export const getUserData = async (userId: string) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return userSnap.data();
    }
    return null;
  } catch (error) {
    return null;
  }
};
