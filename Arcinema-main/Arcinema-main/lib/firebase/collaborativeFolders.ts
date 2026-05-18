/**
 * Collaborative Folders System - REDESIGNED
 * 
 * Uses Firestore's collaborativeFolders collection for real-time sync.
 * When one user adds/removes items, all collaborators see changes immediately via Firestore listeners.
 * 
 * Key Features:
 * - Single source of truth in collaborativeFolders collection
 * - Real-time sync via Firestore onSnapshot listeners
 * - All collaborators can add/remove items
 * - Automatic updates for all users
 * - Requires invitation and acceptance
 */

import { projectFirestore as db } from '@/firebase/config';
import { 
  collection, 
  doc, 
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  arrayUnion,
  arrayRemove,
  onSnapshot,
  Unsubscribe,
  or,
} from 'firebase/firestore';
import { SavedMedia } from '@/types/user';

// Type for collaborative folder document in Firestore
export interface CollaborativeFolder {
  id: string;
  name: string;
  items: SavedMedia[];
  ownerId: string;
  ownerName: string;
  collaborators: string[]; // Array of user IDs who can edit
  createdAt: string;
  updatedAt: string;
  icon?: string;
  color?: string;
}

/**
 * Create a new collaborative folder in the collaborativeFolders collection
 */
export const createCollaborativeFolder = async (
  folderName: string,
  ownerId: string,
  ownerName: string,
  initialItems: SavedMedia[] = []
): Promise<{ success: boolean; folderId?: string; message: string }> => {
  try {
    const folderId = `collab_${Date.now()}`;
    const now = new Date().toISOString();

    const newFolder: CollaborativeFolder = {
      id: folderId,
      name: folderName,
      items: initialItems,
      ownerId,
      ownerName,
      collaborators: [], // Initially empty, will add when invites accepted
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(doc(db, 'collaborativeFolders', folderId), newFolder);
    return {
      success: true,
      folderId,
      message: `Collaborative folder "${folderName}" created successfully!`
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to create collaborative folder.'
    };
  }
};

/**
 * Send collaborative folder invitations to multiple users
 */
export const sendCollaborativeFolderInvites = async (
  folderId: string,
  folderName: string,
  fromUserId: string,
  fromUserName: string,
  collaboratorIds: string[]
): Promise<{ success: boolean; message: string }> => {
  try {
    if (!collaboratorIds || collaboratorIds.length === 0) {
      return { success: false, message: 'No collaborators selected.' };
    }

    // Verify the folder exists in collaborativeFolders collection
    const folderRef = doc(db, 'collaborativeFolders', folderId);
    const folderSnap = await getDoc(folderRef);

    if (!folderSnap.exists()) {
      return { success: false, message: 'Collaborative folder not found.' };
    }

    // Create invitations for each collaborator
    const invitePromises = collaboratorIds.map(async (toUserId) => {
      try {
        // Get recipient info
        const recipientDoc = await getDoc(doc(db, 'users', toUserId));
        if (!recipientDoc.exists()) {
          return;
        }
        
        const recipientData = recipientDoc.data();

        // Create invitation document
        const inviteId = `${folderId}_${toUserId}_${Date.now()}`;
        const inviteData = {
          id: inviteId,
          folderId,
          folderName,
          fromUserId,
          fromUserName,
          fromUserEmail: '', // Not needed for collaborative
          toUserId,
          toUserEmail: recipientData.email || '',
          status: 'pending',
          isCollaborative: true, // Mark as collaborative
          createdAt: new Date().toISOString(),
        };

        await setDoc(doc(db, 'folderShareInvites', inviteId), inviteData);
        // Create notification for the recipient
        const notificationId = `collab_${inviteId}`;
        const notificationData = {
          id: notificationId,
          userId: toUserId,
          type: 'collaborative_folder',
          title: 'Collaborative Folder Invitation',
          message: `${fromUserName} invited you to collaborate on "${folderName}"`,
          isRead: false,
          createdAt: new Date().toISOString(),
          metadata: {
            inviteId,
            folderId,
            folderName,
            fromUserId,
            fromUserName,
          },
        };

        await setDoc(doc(db, 'notifications', notificationId), notificationData);
      } catch (error) {
      }
    });

    await Promise.all(invitePromises);

    return {
      success: true,
      message: `Collaborative invitations sent to ${collaboratorIds.length} user(s)!`
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to send invitations. Please try again.'
    };
  }
};

/**
 * Accept a collaborative folder invitation
 * Adds user to the collaborators array in the collaborativeFolders document
 */
export const acceptCollaborativeInvite = async (
  inviteId: string,
  userId: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const inviteRef = doc(db, 'folderShareInvites', inviteId);
    const inviteSnap = await getDoc(inviteRef);

    if (!inviteSnap.exists()) {
      return { success: false, message: 'Invitation not found.' };
    }

    const invite = inviteSnap.data();

    if (invite.toUserId !== userId) {
      return { success: false, message: 'This invitation is not for you.' };
    }

    if (invite.status !== 'pending') {
      return { success: false, message: 'This invitation has already been processed.' };
    }

    // Get the collaborative folder from the collection
    const folderRef = doc(db, 'collaborativeFolders', invite.folderId);
    const folderSnap = await getDoc(folderRef);

    if (!folderSnap.exists()) {
      return { success: false, message: 'Collaborative folder not found.' };
    }

    // Add user to collaborators array
    await updateDoc(folderRef, {
      collaborators: arrayUnion(userId),
      updatedAt: new Date().toISOString()
    });
    // Update invite status
    await updateDoc(inviteRef, {
      status: 'accepted',
      respondedAt: new Date().toISOString()
    });
    return {
      success: true,
      message: `You are now collaborating on "${invite.folderName}"!`
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to accept invitation. Please try again.'
    };
  }
};

/**
 * Add item to collaborative folder - automatically syncs to all collaborators
 */
export const addItemToCollaborativeFolder = async (
  folderId: string,
  item: SavedMedia,
  currentUserId: string
): Promise<{ success: boolean; message: string }> => {
  try {
    // Get the collaborative folder
    const folderRef = doc(db, 'collaborativeFolders', folderId);
    const folderSnap = await getDoc(folderRef);
    
    if (!folderSnap.exists()) {
      return { success: false, message: 'Collaborative folder not found.' };
    }
    
    const folder = folderSnap.data() as CollaborativeFolder;
    
    // Check if user has permission (owner or collaborator)
    const isOwner = folder.ownerId === currentUserId;
    const isCollaborator = folder.collaborators?.includes(currentUserId);
    
    if (!isOwner && !isCollaborator) {
      return { success: false, message: 'You do not have permission to edit this folder.' };
    }
    
    // Check if item already exists
    const itemExists = folder.items.some((existing: SavedMedia) => existing.id === item.id);
    if (itemExists) {
      return { success: false, message: 'Item already in folder.' };
    }
    
    // Add item using arrayUnion (Firestore will handle the sync automatically)
    await updateDoc(folderRef, {
      items: arrayUnion(item),
      updatedAt: new Date().toISOString()
    });
    return {
      success: true,
      message: 'Item added to collaborative folder!'
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to add item. Please try again.'
    };
  }
};

/**
 * Remove item from collaborative folder - automatically syncs to all collaborators
 */
export const removeItemFromCollaborativeFolder = async (
  folderId: string,
  itemId: number,
  currentUserId: string
): Promise<{ success: boolean; message: string }> => {
  try {
    // Get the collaborative folder
    const folderRef = doc(db, 'collaborativeFolders', folderId);
    const folderSnap = await getDoc(folderRef);
    
    if (!folderSnap.exists()) {
      return { success: false, message: 'Collaborative folder not found.' };
    }
    
    const folder = folderSnap.data() as CollaborativeFolder;
    
    // Check if user has permission
    const isOwner = folder.ownerId === currentUserId;
    const isCollaborator = folder.collaborators?.includes(currentUserId);
    
    if (!isOwner && !isCollaborator) {
      return { success: false, message: 'You do not have permission to edit this folder.' };
    }
    
    // Find and remove the item
    const updatedItems = folder.items.filter((item: SavedMedia) => item.id !== itemId);
    
    // Update the folder
    await updateDoc(folderRef, {
      items: updatedItems,
      updatedAt: new Date().toISOString()
    });
    return {
      success: true,
      message: 'Item removed from collaborative folder!'
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to remove item. Please try again.'
    };
  }
};

/**
 * Get all collaborative folders where user is owner or collaborator
 * Returns the actual folder documents from the collaborativeFolders collection
 */
export const getCollaborativeFolders = async (
  userId: string
): Promise<CollaborativeFolder[]> => {
  try {
    const collabFoldersRef = collection(db, 'collaborativeFolders');
    
    // Query for folders where user is owner
    const ownerQuery = query(collabFoldersRef, where('ownerId', '==', userId));
    const ownerSnapshot = await getDocs(ownerQuery);
    
    // Query for folders where user is a collaborator
    const collabQuery = query(collabFoldersRef, where('collaborators', 'array-contains', userId));
    const collabSnapshot = await getDocs(collabQuery);
    
    // Combine results (avoiding duplicates)
    const folderMap = new Map<string, CollaborativeFolder>();
    
    ownerSnapshot.docs.forEach(doc => {
      folderMap.set(doc.id, doc.data() as CollaborativeFolder);
    });
    
    collabSnapshot.docs.forEach(doc => {
      if (!folderMap.has(doc.id)) {
        folderMap.set(doc.id, doc.data() as CollaborativeFolder);
      }
    });
    
    return Array.from(folderMap.values());
  } catch (error) {
    return [];
  }
};

/**
 * Subscribe to real-time updates for a collaborative folder
 * Returns an unsubscribe function
 */
export const subscribeToCollaborativeFolder = (
  folderId: string,
  callback: (folder: CollaborativeFolder | null) => void
): Unsubscribe => {
  const folderRef = doc(db, 'collaborativeFolders', folderId);
  
  return onSnapshot(folderRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as CollaborativeFolder);
    } else {
      callback(null);
    }
  }, (error) => {
    callback(null);
  });
};

/**
 * Subscribe to real-time updates for all collaborative folders where user is owner or collaborator
 * Returns an unsubscribe function
 */
export const subscribeToUserCollaborativeFolders = (
  userId: string,
  callback: (folders: CollaborativeFolder[]) => void
): Unsubscribe => {
  const collabFoldersRef = collection(db, 'collaborativeFolders');
  
  // Create compound query for owner OR collaborator
  // Note: Firestore doesn't support OR queries directly in older versions,
  // so we'll use two separate listeners and merge results
  
  const ownerQuery = query(collabFoldersRef, where('ownerId', '==', userId));
  const collabQuery = query(collabFoldersRef, where('collaborators', 'array-contains', userId));
  
  let ownerFolders: CollaborativeFolder[] = [];
  let collabFolders: CollaborativeFolder[] = [];
  
  const mergeAndNotify = () => {
    const folderMap = new Map<string, CollaborativeFolder>();
    
    ownerFolders.forEach(folder => folderMap.set(folder.id, folder));
    collabFolders.forEach(folder => {
      if (!folderMap.has(folder.id)) {
        folderMap.set(folder.id, folder);
      }
    });
    
    callback(Array.from(folderMap.values()));
  };
  
  const unsubscribeOwner = onSnapshot(ownerQuery, (snapshot) => {
    ownerFolders = snapshot.docs.map(doc => doc.data() as CollaborativeFolder);
    mergeAndNotify();
  });
  
  const unsubscribeCollab = onSnapshot(collabQuery, (snapshot) => {
    collabFolders = snapshot.docs.map(doc => doc.data() as CollaborativeFolder);
    mergeAndNotify();
  });
  
  // Return combined unsubscribe function
  return () => {
    unsubscribeOwner();
    unsubscribeCollab();
  };
};

/**
 * Delete a collaborative folder (owner only)
 */
export const deleteCollaborativeFolder = async (
  folderId: string,
  userId: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const folderRef = doc(db, 'collaborativeFolders', folderId);
    const folderSnap = await getDoc(folderRef);
    
    if (!folderSnap.exists()) {
      return { success: false, message: 'Folder not found.' };
    }
    
    const folder = folderSnap.data() as CollaborativeFolder;
    
    // Only owner can delete
    if (folder.ownerId !== userId) {
      return { success: false, message: 'Only the folder owner can delete it.' };
    }
    
    await deleteDoc(folderRef);
    
    return {
      success: true,
      message: 'Collaborative folder deleted successfully.'
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to delete folder.'
    };
  }
};

/**
 * Leave a collaborative folder (collaborator only, not owner)
 */
export const leaveCollaborativeFolder = async (
  folderId: string,
  userId: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const folderRef = doc(db, 'collaborativeFolders', folderId);
    const folderSnap = await getDoc(folderRef);
    
    if (!folderSnap.exists()) {
      return { success: false, message: 'Folder not found.' };
    }
    
    const folder = folderSnap.data() as CollaborativeFolder;
    
    // Can't leave if you're the owner
    if (folder.ownerId === userId) {
      return { success: false, message: 'Owner cannot leave. Delete the folder instead.' };
    }
    
    // Remove user from collaborators
    await updateDoc(folderRef, {
      collaborators: arrayRemove(userId),
      updatedAt: new Date().toISOString()
    });
    
    return {
      success: true,
      message: 'Left collaborative folder successfully.'
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to leave folder.'
    };
  }
};

/**
 * Rename a collaborative folder (owner only)
 */
export const renameCollaborativeFolder = async (
  folderId: string,
  newName: string,
  userId: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const folderRef = doc(db, 'collaborativeFolders', folderId);
    const folderSnap = await getDoc(folderRef);
    
    if (!folderSnap.exists()) {
      return { success: false, message: 'Folder not found.' };
    }
    
    const folder = folderSnap.data() as CollaborativeFolder;
    
    // Only owner can rename
    if (folder.ownerId !== userId) {
      return { success: false, message: 'Only the folder owner can rename it.' };
    }
    
    await updateDoc(folderRef, {
      name: newName,
      updatedAt: new Date().toISOString()
    });
    
    return {
      success: true,
      message: 'Folder renamed successfully.'
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to rename folder.'
    };
  }
};
