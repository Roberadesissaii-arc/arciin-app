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
  Timestamp
} from 'firebase/firestore';
import { FolderShareInvite, SharedFolder, CustomCollection } from '@/types/user';

/**
 * Search for public users by username prefix (for autocomplete)
 */
export const searchPublicUsers = async (
  searchTerm: string,
  currentUserId: string,
  limit: number = 10
): Promise<Array<{ id: string; username: string; displayName: string; email: string; avatarId?: string }>> => {
  try {
    // Remove @ symbol if present and check minimum length
    const cleanSearch = searchTerm.startsWith('@') ? searchTerm.slice(1) : searchTerm;
    
    if (!cleanSearch || cleanSearch.length < 1) {
      return [];
    }

    const usersRef = collection(db, 'users');
    
    // Search for users where:
    // 1. Profile visibility is public (privacy.profileVisibility === 'public')
    // 2. Username starts with searchTerm
    // 3. Not the current user
    const publicUsersQuery = query(
      usersRef,
      where('privacy.profileVisibility', '==', 'public')
    );
    
    const snapshot = await getDocs(publicUsersQuery);
    const searchLower = cleanSearch.toLowerCase();
    
    const matchingUsers = snapshot.docs
      .filter(doc => {
        const data = doc.data();
        const username = (data.username || '').toLowerCase();
        const displayName = (data.displayName || '').toLowerCase();
        // Exclude current user
        if (doc.id === currentUserId) return false;
        
        // Match username or displayName starting with searchTerm
        return username.startsWith(searchLower) || 
               displayName.startsWith(searchLower);
      })
      .slice(0, limit)
      .map(doc => {
        const data = doc.data();
        // Use email as displayName if no displayName exists
        const displayName = data.displayName || data.email?.split('@')[0] || data.username || 'User';
        
        const result = {
          id: doc.id,
          username: data.username || data.email?.split('@')[0] || '', // Use email prefix if no username
          displayName: displayName,
          email: data.email || '',
          avatarId: data.avatarId // Let getAvatarPath handle fallback
        };
        return result;
      });
    
    return matchingUsers;
  } catch (error) {
    return [];
  }
};

/**
 * Share a folder with another user by email, username, or userId
 */
export const shareFolderWithUser = async (
  folderId: string,
  folderName: string,
  fromUserId: string,
  fromUserName: string,
  fromUserEmail: string,
  recipientEmailOrUsername: string,
  folderItems?: any[], // Optional: pass folder items to include in notification
  selectedUserId?: string | null // Optional: exact userId if user was selected from dropdown
): Promise<{ success: boolean; message: string }> => {
  try {
    let recipientId: string;
    let recipientData: any;

    // If we have a selected user ID (from dropdown selection), use it directly
    if (selectedUserId) {
      const userDoc = await getDoc(doc(db, 'users', selectedUserId));
      
      if (!userDoc.exists()) {
        return {
          success: false,
          message: 'Selected user not found.'
        };
      }
      
      recipientId = selectedUserId;
      recipientData = userDoc.data();
    } else {
      // Fall back to searching by email or username
      // Check if recipient is provided
      if (!recipientEmailOrUsername || recipientEmailOrUsername.trim() === '') {
        return {
          success: false,
          message: 'Please provide a username or email.'
        };
      }
      
      // Strip @ symbol if present for username search
      const cleanRecipient = recipientEmailOrUsername.startsWith('@') 
        ? recipientEmailOrUsername.substring(1) 
        : recipientEmailOrUsername;
      // Find the recipient user by email or username
      const usersRef = collection(db, 'users');
      
      // Try email first (more unique)
      const emailQuery = query(usersRef, where('email', '==', cleanRecipient.toLowerCase()));
      let recipientSnapshot = await getDocs(emailQuery);
      // If not found, try exact username match
      if (recipientSnapshot.empty) {
        const usernameExactQuery = query(usersRef, where('username', '==', cleanRecipient));
        recipientSnapshot = await getDocs(usernameExactQuery);
      }
      
      // Last resort: case-insensitive username
      if (recipientSnapshot.empty) {
        const usernameQuery = query(usersRef, where('username', '==', cleanRecipient.toLowerCase()));
        recipientSnapshot = await getDocs(usernameQuery);
      }
      
      if (recipientSnapshot.empty) {
        return {
          success: false,
          message: 'User not found. Please check the email or username.'
        };
      }
      
      // If multiple users found with same username, return error
      if (recipientSnapshot.size > 1) {
        return {
          success: false,
          message: 'Multiple users found with this username. Please use email or select from dropdown.'
        };
      }
      
      const recipientDoc = recipientSnapshot.docs[0];
      recipientData = recipientDoc.data();
      recipientId = recipientDoc.id;
    }
    
    // Don't allow sharing with yourself
    if (recipientId === fromUserId) {
      return {
        success: false,
        message: 'You cannot share a folder with yourself.'
      };
    }
    // Check if invitation already exists
    const invitesRef = collection(db, 'folderShareInvites');
    const existingInviteQuery = query(
      invitesRef,
      where('folderId', '==', folderId),
      where('toUserId', '==', recipientId),
      where('status', '==', 'pending')
    );
    const existingInvites = await getDocs(existingInviteQuery);
    if (!existingInvites.empty) {
      return {
        success: false,
        message: 'An invitation to this user is already pending.'
      };
    }
    
    // Create the share invitation
    const inviteId = `${folderId}_${recipientId}_${Date.now()}`;
    const invite: FolderShareInvite = {
      id: inviteId,
      folderId,
      folderName,
      fromUserId,
      fromUserName,
      fromUserEmail,
      toUserId: recipientId,
      toUserEmail: recipientData.email,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'folderShareInvites', inviteId), invite);
    // Create a notification for the recipient
    const notificationId = `folder_share_${Date.now()}`;
    // Get the first movie/item from folder for notification preview
    const firstItem = folderItems && folderItems.length > 0 ? folderItems[0] : null;
    
    // Build notification data - only include defined fields
    const notificationData: any = {
      id: notificationId,
      userId: recipientId,
      type: 'folder_share',
      title: 'New Folder Shared',
      message: `${fromUserName} shared the folder "${folderName}" with you`,
      metadata: {
        inviteId,
        folderId,
        folderName,
        fromUserId,
        fromUserName
      },
      isRead: false,
      createdAt: new Date().toISOString()
    };
    
    // Only add movieData or tvShowData if they exist (not undefined)
    if (firstItem) {
      if (firstItem.type === 'movie' || firstItem.media_type === 'movie') {
        notificationData.movieData = {
          id: firstItem.id,
          title: firstItem.title,
          poster_path: firstItem.poster_path
        };
      } else if (firstItem.type === 'tv' || firstItem.media_type === 'tv') {
        notificationData.tvShowData = {
          id: firstItem.id,
          name: firstItem.name || firstItem.title,
          poster_path: firstItem.poster_path
        };
      }
    }
    
    await setDoc(doc(db, 'notifications', notificationId), notificationData);
    return {
      success: true,
      message: `Folder shared with @${recipientData.username || recipientData.email} successfully!`
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to share folder. Please try again.'
    };
  }
};

/**
 * Accept a folder share invitation
 */
export const acceptFolderInvite = async (
  inviteId: string,
  userId: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const inviteRef = doc(db, 'folderShareInvites', inviteId);
    const inviteSnap = await getDoc(inviteRef);
    
    if (!inviteSnap.exists()) {
      return { success: false, message: 'Invitation not found.' };
    }
    
    const invite = inviteSnap.data() as FolderShareInvite;
    if (invite.toUserId !== userId) {
      return { success: false, message: 'This invitation is not for you.' };
    }
    
    if (invite.status !== 'pending') {
      return { success: false, message: 'This invitation has already been processed.' };
    }
    
    // Get the actual folder data from the owner
    const ownerRef = doc(db, 'users', invite.fromUserId);
    const ownerSnap = await getDoc(ownerRef);
    
    if (!ownerSnap.exists()) {
      return { success: false, message: 'Folder owner not found.' };
    }
    
    const ownerData = ownerSnap.data();
    const customCollections = ownerData.customCollections || [];
    
    // Find the shared folder
    const sharedFolder = customCollections.find(
      (collection: CustomCollection) => collection.id === invite.folderId
    );
    
    if (!sharedFolder) {
      return { success: false, message: 'Folder not found.' };
    }
    // Add folder to recipient's customCollections
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return { success: false, message: 'User not found.' };
    }
    
    const userData = userSnap.data();
    const userCollections = userData.customCollections || [];
    
    // Create a new folder for the recipient with the same items
    const newFolder: CustomCollection = {
      id: `custom_${Date.now()}`, // New ID for recipient's copy
      name: sharedFolder.name,
      items: sharedFolder.items || [], // Copy all items
      createdAt: new Date().toISOString(),
      isShared: true,
      sharedFrom: {
        userId: invite.fromUserId,
        userName: invite.fromUserName,
        originalFolderId: invite.folderId
      }
    };
    // Add to recipient's collections
    await updateDoc(userRef, {
      customCollections: [...userCollections, newFolder]
    });
    
    // Update invite status
    await updateDoc(inviteRef, {
      status: 'accepted',
      respondedAt: new Date().toISOString()
    });
    return {
      success: true,
      message: `Folder "${invite.folderName}" with ${sharedFolder.items.length} items added to your collection!`
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to accept invitation. Please try again.'
    };
  }
};

/**
 * Check if user has a folder with the same name (case-insensitive)
 */
export const checkDuplicateFolderName = async (
  userId: string,
  folderName: string
): Promise<{ hasDuplicate: boolean; existingName?: string }> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return { hasDuplicate: false };
    }
    
    const userData = userSnap.data();
    const customCollections = userData.customCollections || [];
    
    const duplicate = customCollections.find(
      (folder: CustomCollection) => 
        folder.name.toLowerCase() === folderName.toLowerCase()
    );
    
    return {
      hasDuplicate: !!duplicate,
      existingName: duplicate?.name
    };
  } catch (error) {
    return { hasDuplicate: false };
  }
};

/**
 * Accept folder invite and merge with existing folder
 */
export const acceptAndMergeFolderInvite = async (
  inviteId: string,
  userId: string,
  existingFolderId: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const inviteRef = doc(db, 'folderShareInvites', inviteId);
    const inviteSnap = await getDoc(inviteRef);
    
    if (!inviteSnap.exists()) {
      return { success: false, message: 'Invitation not found.' };
    }
    
    const invite = inviteSnap.data() as FolderShareInvite;
    
    // Get the shared folder items from owner
    const ownerRef = doc(db, 'users', invite.fromUserId);
    const ownerSnap = await getDoc(ownerRef);
    
    if (!ownerSnap.exists()) {
      return { success: false, message: 'Shared folder owner not found.' };
    }
    
    const ownerData = ownerSnap.data();
    const sharedFolder = ownerData.customCollections?.find(
      (c: CustomCollection) => c.id === invite.folderId
    );
    
    if (!sharedFolder) {
      return { success: false, message: 'Shared folder not found.' };
    }
    
    // Get user's existing folder
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return { success: false, message: 'User not found.' };
    }
    
    const userData = userSnap.data();
    const customCollections = userData.customCollections || [];
    
    // Merge items (avoid duplicates by checking id)
    const updatedCollections = customCollections.map((collection: CustomCollection) => {
      if (collection.id === existingFolderId) {
        const existingIds = new Set(collection.items.map(item => item.id));
        const newItems = sharedFolder.items.filter(
          (item: any) => !existingIds.has(item.id)
        );
        
        return {
          ...collection,
          items: [...collection.items, ...newItems]
        };
      }
      return collection;
    });
    
    await updateDoc(userRef, {
      customCollections: updatedCollections
    });
    
    // Update invite status
    await updateDoc(inviteRef, {
      status: 'accepted',
      respondedAt: new Date().toISOString()
    });
    
    // Also add to sharedFolders list for tracking
    await updateDoc(userRef, {
      sharedFolders: arrayUnion({
        folderId: invite.folderId,
        ownerId: invite.fromUserId,
        ownerName: invite.fromUserName,
        folderName: invite.folderName,
        sharedAt: new Date().toISOString(),
        mergedInto: existingFolderId
      })
    });
    
    return {
      success: true,
      message: `Merged items into your "${customCollections.find((c: CustomCollection) => c.id === existingFolderId)?.name}" folder!`
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to merge folders. Please try again.'
    };
  }
};

/**
 * Accept folder invite as new folder with auto-renamed name
 */
export const acceptAsNewFolder = async (
  inviteId: string,
  userId: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const inviteRef = doc(db, 'folderShareInvites', inviteId);
    const inviteSnap = await getDoc(inviteRef);
    
    if (!inviteSnap.exists()) {
      return { success: false, message: 'Invitation not found.' };
    }
    
    const invite = inviteSnap.data() as FolderShareInvite;
    
    // Get the shared folder from owner
    const ownerRef = doc(db, 'users', invite.fromUserId);
    const ownerSnap = await getDoc(ownerRef);
    
    if (!ownerSnap.exists()) {
      return { success: false, message: 'Shared folder owner not found.' };
    }
    
    const ownerData = ownerSnap.data();
    const sharedFolder = ownerData.customCollections?.find(
      (c: CustomCollection) => c.id === invite.folderId
    );
    
    if (!sharedFolder) {
      return { success: false, message: 'Shared folder not found.' };
    }
    
    // Get user's folders to find next available number
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return { success: false, message: 'User not found.' };
    }
    
    const userData = userSnap.data();
    const customCollections = userData.customCollections || [];
    
    // Find next available number for duplicate name
    let newName = invite.folderName;
    let counter = 2;
    
    while (customCollections.some(
      (c: CustomCollection) => c.name.toLowerCase() === newName.toLowerCase()
    )) {
      newName = `${invite.folderName} #${counter}`;
      counter++;
    }
    
    // Create new folder with items from shared folder
    const newFolderId = `folder_${Date.now()}`;
    const newFolder: CustomCollection = {
      id: newFolderId,
      name: newName,
      items: sharedFolder.items.map((item: any) => ({ ...item })), // Clone items
      createdAt: new Date().toISOString(),
      ownerId: userId,
      ownerName: userData.displayName || userData.username || 'User',
      sharedWith: [],
      isShared: false
    };
    
    await updateDoc(userRef, {
      customCollections: arrayUnion(newFolder),
      sharedFolders: arrayUnion({
        folderId: invite.folderId,
        ownerId: invite.fromUserId,
        ownerName: invite.fromUserName,
        folderName: invite.folderName,
        sharedAt: new Date().toISOString(),
        copiedAs: newFolderId
      })
    });
    
    // Update invite status
    await updateDoc(inviteRef, {
      status: 'accepted',
      respondedAt: new Date().toISOString()
    });
    
    return {
      success: true,
      message: `Created new folder "${newName}" with shared items!`
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to create folder. Please try again.'
    };
  }
};

/**
 * Reject a folder share invitation
 */
export const rejectFolderInvite = async (
  inviteId: string,
  userId: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const inviteRef = doc(db, 'folderShareInvites', inviteId);
    const inviteSnap = await getDoc(inviteRef);
    
    if (!inviteSnap.exists()) {
      return { success: false, message: 'Invitation not found.' };
    }
    
    const invite = inviteSnap.data() as FolderShareInvite;
    
    if (invite.toUserId !== userId) {
      return { success: false, message: 'This invitation is not for you.' };
    }
    
    // Update invite status
    await updateDoc(inviteRef, {
      status: 'rejected',
      respondedAt: new Date().toISOString()
    });
    
    return {
      success: true,
      message: 'Invitation rejected.'
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to reject invitation. Please try again.'
    };
  }
};

/**
 * Get all pending folder invitations for a user
 */
export const getPendingFolderInvites = async (
  userId: string
): Promise<FolderShareInvite[]> => {
  try {
    const invitesRef = collection(db, 'folderShareInvites');
    const q = query(
      invitesRef,
      where('toUserId', '==', userId),
      where('status', '==', 'pending')
    );
    
    const querySnapshot = await getDocs(q);
    const invites = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return data as FolderShareInvite;
    });
    return invites;
  } catch (error) {
    return [];
  }
};

/**
 * Get users who have access to a shared folder
 */
export const getFolderSharedUsers = async (
  folderId: string,
  userId: string
): Promise<Array<{ userId: string; email: string; name: string }>> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return [];
    }
    
    const userData = userSnap.data();
    const customCollections = userData.customCollections || [];
    const folder = customCollections.find((c: CustomCollection) => c.id === folderId);
    
    if (!folder || !folder.sharedWith || folder.sharedWith.length === 0) {
      return [];
    }
    
    // Fetch user details for each shared user
    const sharedUserDetails = await Promise.all(
      folder.sharedWith.map(async (sharedUserId: string) => {
        try {
          const sharedUserRef = doc(db, 'users', sharedUserId);
          const sharedUserSnap = await getDoc(sharedUserRef);
          
          if (sharedUserSnap.exists()) {
            const sharedUserData = sharedUserSnap.data();
            return {
              userId: sharedUserId,
              email: sharedUserData.email || '',
              name: sharedUserData.displayName || sharedUserData.username || 'User'
            };
          }
          return null;
        } catch (error) {
          return null;
        }
      })
    );
    
    // Filter out null values
    return sharedUserDetails.filter(user => user !== null) as Array<{ userId: string; email: string; name: string }>;
  } catch (error) {
    return [];
  }
};

/**
 * Unshare folder from a specific user
 */
export const unshareFolder = async (
  ownerId: string,
  folderId: string,
  userIdToRemove: string
): Promise<{ success: boolean; message: string }> => {
  try {
    // Remove from owner's sharedWith list
    const ownerRef = doc(db, 'users', ownerId);
    const ownerSnap = await getDoc(ownerRef);
    
    if (!ownerSnap.exists()) {
      return { success: false, message: 'Owner not found.' };
    }
    
    const ownerData = ownerSnap.data();
    const customCollections = ownerData.customCollections || [];
    
    const updatedCollections = customCollections.map((c: CustomCollection) => {
      if (c.id === folderId) {
        return {
          ...c,
          sharedWith: (c.sharedWith || []).filter(id => id !== userIdToRemove)
        };
      }
      return c;
    });
    
    await updateDoc(ownerRef, {
      customCollections: updatedCollections
    });
    
    // Remove folder from recipient's collection
    const userRef = doc(db, 'users', userIdToRemove);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      const userCollections = userData.customCollections || [];
      
      const filteredCollections = userCollections.filter((c: CustomCollection) => {
        if (c.sharedFrom && c.sharedFrom.originalFolderId === folderId) {
          return false;
        }
        return true;
      });
      
      await updateDoc(userRef, {
        customCollections: filteredCollections
      });
    }
    
    return {
      success: true,
      message: 'Folder unshared successfully.'
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to unshare folder.'
    };
  }
};

/**
 * Rename a folder
 */
export const renameFolder = async (
  userId: string,
  folderId: string,
  newName: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return { success: false, message: 'User not found.' };
    }
    
    const userData = userSnap.data();
    const customCollections = userData.customCollections || [];
    
    const updatedCollections = customCollections.map((c: CustomCollection) => {
      if (c.id === folderId) {
        return { ...c, name: newName };
      }
      return c;
    });
    
    await updateDoc(userRef, {
      customCollections: updatedCollections
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

/**
 * ========================================
 * COLLABORATIVE FOLDERS MOVED TO SEPARATE FILE
 * ========================================
 * 
 * All collaborative folder functions have been moved to:
 * @see lib/firebase/collaborativeFolders.ts
 * 
 * This file (folderSharing.ts) now only handles:
 * - Regular folder sharing (one-time copy, view-only)
 * - Folder share invitations for regular shared folders
 * 
 * For collaborative folders (real-time sync), use:
 * @see lib/firebase/collaborativeFolders.ts
 */

