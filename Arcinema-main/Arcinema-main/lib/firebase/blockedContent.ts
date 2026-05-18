import { projectFirestore as db } from '@/firebase/config';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDoc,
  getDocs,
  query
} from 'firebase/firestore';

export interface BlockedContent {
  id: number;
  mediaType: 'movie' | 'tv' | 'anime';
  title: string;
  blockedAt: string;
  blockedBy?: string; // Admin user ID
  reason?: string;
}

// Collection reference
const blockedContentCollection = collection(db, 'blockedContent');

// Block a movie/TV show/anime
export const blockContent = async (
  id: number, 
  mediaType: 'movie' | 'tv' | 'anime',
  title: string,
  userId?: string,
  reason?: string
): Promise<void> => {
  const docRef = doc(blockedContentCollection, `${mediaType}_${id}`);
  
  const blockedData: BlockedContent = {
    id,
    mediaType,
    title,
    blockedAt: new Date().toISOString(),
    blockedBy: userId,
    reason
  };
  await setDoc(docRef, blockedData);
};

// Unblock a movie/TV show/anime
export const unblockContent = async (
  id: number, 
  mediaType: 'movie' | 'tv' | 'anime'
): Promise<void> => {
  const docRef = doc(blockedContentCollection, `${mediaType}_${id}`);
  await deleteDoc(docRef);
};

// Check if content is blocked
export const isContentBlocked = async (
  id: number, 
  mediaType: 'movie' | 'tv' | 'anime'
): Promise<boolean> => {
  const docRef = doc(blockedContentCollection, `${mediaType}_${id}`);
  const docSnap = await getDoc(docRef);
  return docSnap.exists();
};

// Get all blocked content IDs (cached in memory)
let blockedContentCache: Map<string, boolean> | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const getAllBlockedContent = async (): Promise<Map<string, boolean>> => {
  // Return cache if still valid
  const now = Date.now();
  if (blockedContentCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return blockedContentCache;
  }
  
  // Fetch fresh data
  const q = query(blockedContentCollection);
  const querySnapshot = await getDocs(q);
  
  const blockedMap = new Map<string, boolean>();
  querySnapshot.forEach((doc) => {
    const data = doc.data() as BlockedContent;
    const key = `${data.mediaType}_${data.id}`;
    blockedMap.set(key, true);
  });
  
  // Update cache
  blockedContentCache = blockedMap;
  cacheTimestamp = now;
  
  return blockedMap;
};

// Filter out blocked content from results
export const filterBlockedContent = async <T extends { id: number; media_type?: string }>(
  items: T[],
  mediaType: 'movie' | 'tv' | 'anime'
): Promise<T[]> => {
  const blockedMap = await getAllBlockedContent();
  
  const filtered = items.filter(item => {
    const type = item.media_type || mediaType;
    const key = `${type}_${item.id}`;
    const isBlocked = blockedMap.has(key);
    
    if (isBlocked) {
    }
    
    return !isBlocked;
  });
  
  return filtered;
};

// Clear cache (call this after blocking/unblocking)
export const clearBlockedContentCache = (): void => {
  blockedContentCache = null;
  cacheTimestamp = 0;
};
