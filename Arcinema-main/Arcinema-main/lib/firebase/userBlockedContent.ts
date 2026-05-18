import { projectFirestore as db } from '@/firebase/config';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDoc,
  getDocs,
  query,
  where
} from 'firebase/firestore';
import { clearBlockedContentCache } from './contentFilter';

export interface UserBlockedContent {
  id: number;
  mediaType: 'movie' | 'tv' | 'anime';
  title: string;
  blockedAt: string;
  userId: string;
}

export interface BlockedPerson {
  id: number;
  name: string;
  profilePath?: string;
  blockedAt: string;
  blockedBy: string;
  reason: string;
}

// Admin email
const ADMIN_EMAIL = 'admin@arcinema.com';

// Check if user is admin
export const isAdmin = (userEmail: string | null | undefined): boolean => {
  return userEmail === ADMIN_EMAIL;
};

// Block content for a specific user (or globally if admin)
export const blockContentForUser = async (
  id: number, 
  mediaType: 'movie' | 'tv' | 'anime',
  title: string,
  userId: string,
  userEmail: string
): Promise<void> => {
  // If admin, block globally (in blockedContent collection)
  if (isAdmin(userEmail)) {
    const globalDocRef = doc(db, 'blockedContent', `${mediaType}_${id}`);
    await setDoc(globalDocRef, {
      id,
      mediaType,
      title,
      blockedAt: new Date().toISOString(),
      blockedBy: userId,
      reason: 'Admin block'
    });
    // Clear cache so new blocks are immediately reflected
    clearBlockedContentCache();
  } else {
    // Regular user - block only for them
    const userDocRef = doc(db, 'userBlockedContent', `${userId}_${mediaType}_${id}`);
    await setDoc(userDocRef, {
      id,
      mediaType,
      title,
      blockedAt: new Date().toISOString(),
      userId
    });
  }
};

// Unblock content for a specific user (or globally if admin)
export const unblockContentForUser = async (
  id: number, 
  mediaType: 'movie' | 'tv' | 'anime',
  userId: string,
  userEmail: string
): Promise<void> => {
  if (isAdmin(userEmail)) {
    // Admin unblocks globally
    const globalDocRef = doc(db, 'blockedContent', `${mediaType}_${id}`);
    await deleteDoc(globalDocRef);
    // Clear cache so unblocks are immediately reflected
    clearBlockedContentCache();
  } else {
    // Regular user unblocks for themselves
    const userDocRef = doc(db, 'userBlockedContent', `${userId}_${mediaType}_${id}`);
    await deleteDoc(userDocRef);
  }
};

// Get all blocked content for a specific user (includes global admin blocks)
export const getUserBlockedContent = async (userId: string): Promise<Set<string>> => {
  const blockedSet = new Set<string>();
  
  // Get global admin blocks
  const globalQuery = query(collection(db, 'blockedContent'));
  const globalSnapshot = await getDocs(globalQuery);
  globalSnapshot.forEach((doc) => {
    const data = doc.data();
    const key = `${data.mediaType}_${data.id}`;
    blockedSet.add(key);
  });
  
  // Get user-specific blocks
  const userQuery = query(
    collection(db, 'userBlockedContent'),
    where('userId', '==', userId)
  );
  const userSnapshot = await getDocs(userQuery);
  userSnapshot.forEach((doc) => {
    const data = doc.data();
    const key = `${data.mediaType}_${data.id}`;
    blockedSet.add(key);
  });
  
  return blockedSet;
};

// Block a person (admin only) - this will block all content featuring this person
export const blockPersonForAdmin = async (
  personId: number,
  personName: string,
  profilePath: string | null,
  adminUserId: string,
  adminEmail: string
): Promise<void> => {
  if (!isAdmin(adminEmail)) {
    throw new Error('Only administrators can block persons');
  }

  const personDocRef = doc(db, 'blockedPersons', personId.toString());
  await setDoc(personDocRef, {
    id: personId,
    name: personName,
    profilePath,
    blockedAt: new Date().toISOString(),
    blockedBy: adminUserId,
    reason: 'Admin person block'
  });

  // Clear cache to reflect the new person block
  clearBlockedContentCache();
};

// Unblock a person (admin only)
export const unblockPersonForAdmin = async (
  personId: number,
  adminUserId: string,
  adminEmail: string
): Promise<void> => {
  if (!isAdmin(adminEmail)) {
    throw new Error('Only administrators can unblock persons');
  }

  const personDocRef = doc(db, 'blockedPersons', personId.toString());
  await deleteDoc(personDocRef);

  // Clear cache to reflect the unblock
  clearBlockedContentCache();
};

// Check if a person is blocked
export const isPersonBlocked = async (personId: number): Promise<boolean> => {
  const personDocRef = doc(db, 'blockedPersons', personId.toString());
  const personDoc = await getDoc(personDocRef);
  return personDoc.exists();
};

// Get all blocked persons
export const getBlockedPersons = async (): Promise<BlockedPerson[]> => {
  const blockedPersonsQuery = query(collection(db, 'blockedPersons'));
  const snapshot = await getDocs(blockedPersonsQuery);
  
  return snapshot.docs.map(doc => doc.data() as BlockedPerson);
};

// Check if content should be filtered based on blocked persons
// This function checks if any cast/crew members are in the blocked persons list
export const shouldFilterContentByPersons = async (
  cast?: Array<{ id: number; name: string }>,
  crew?: Array<{ id: number; name: string }>
): Promise<boolean> => {
  const blockedPersons = await getBlockedPersons();
  const blockedPersonIds = new Set(blockedPersons.map(p => p.id));

  // Check cast
  if (cast) {
    for (const person of cast) {
      if (blockedPersonIds.has(person.id)) {
        return true; // Should be filtered out
      }
    }
  }

  // Check crew
  if (crew) {
    for (const person of crew) {
      if (blockedPersonIds.has(person.id)) {
        return true; // Should be filtered out
      }
    }
  }

  return false; // Don't filter
};

// Enhanced filter function that includes person-based blocking
export const filterBlockedContentForUser = async <T extends { id: number; media_type?: string }>(
  items: T[],
  mediaType: 'movie' | 'tv' | 'anime',
  userId: string
): Promise<T[]> => {
  const blockedSet = await getUserBlockedContent(userId);
  
  // First filter by direct content blocks
  const contentFiltered = items.filter(item => {
    const type = item.media_type || mediaType;
    const key = `${type}_${item.id}`;
    return !blockedSet.has(key);
  });

  // Then filter by blocked persons (this requires fetching cast/crew data)
  // Note: This is a simplified version. In practice, you'd need to fetch
  // cast/crew data for each item and check against blocked persons
  // For performance, this should be done with caching or at the API level
  
  return contentFiltered;
};
