/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/firebase/watchHistory.ts
import { doc, getDoc, updateDoc, arrayUnion} from 'firebase/firestore';
import { projectFirestore, timestamp } from '@/firebase/config';

export interface WatchHistoryItem {
  id: string;
  movieId: number;
  title: string;
  poster_path: string;
  progress: number;
  timestamp: any;
  duration: number;
  media_type: 'movie' | 'tv';
  episode?: {
    season: number;
    episode: number;
    name: string;
  };
}

export const addToWatchHistory = async (
  userId: string,
  data: Omit<WatchHistoryItem, 'id' | 'timestamp'>
) => {
  try {
    const userRef = doc(projectFirestore, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error('User document not found');
    }

    await updateDoc(userRef, {
      watchHistory: arrayUnion({
        ...data,
        id: `${data.movieId}-${Date.now()}`,
        timestamp: timestamp()
      })
    });
  } catch (error) {
    throw error;
  }
};

export const getWatchHistory = async (userId: string): Promise<WatchHistoryItem[]> => {
  try {
    const userRef = doc(projectFirestore, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return [];
    }

    const watchHistory = userDoc.data().watchHistory || [];
    return watchHistory.sort((a: WatchHistoryItem, b: WatchHistoryItem) => 
      b.timestamp.toMillis() - a.timestamp.toMillis()
    );
  } catch (error) {
    throw error;
  }
};