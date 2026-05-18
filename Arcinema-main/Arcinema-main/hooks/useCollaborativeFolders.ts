import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { subscribeToUserCollaborativeFolders, CollaborativeFolder } from '@/lib/firebase/collaborativeFolders';
import { CustomCollection } from '@/types/user';

/**
 * Hook to get collaborative folders with real-time updates
 * Converts CollaborativeFolder to CustomCollection format for UI compatibility
 */
export function useCollaborativeFolders() {
  const { user } = useAuth();
  const [collaborativeFolders, setCollaborativeFolders] = useState<CustomCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setCollaborativeFolders([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Subscribe to real-time updates
    const unsubscribe = subscribeToUserCollaborativeFolders(
      user.uid,
      (folders: CollaborativeFolder[]) => {
        // Convert CollaborativeFolder to CustomCollection format
        const converted: CustomCollection[] = folders.map(folder => ({
          id: folder.id,
          name: folder.name,
          items: folder.items || [],
          createdAt: folder.createdAt,
          ownerId: folder.ownerId,
          ownerName: folder.ownerName,
          isCollaborative: true,
          collaborators: folder.collaborators || [],
          sharedWith: [],
          isShared: false,
          // If user is not the owner, mark it as shared from the owner
          ...(folder.ownerId !== user.uid ? {
            sharedFrom: {
              userId: folder.ownerId,
              userName: folder.ownerName,
              originalFolderId: folder.id,
            }
          } : {})
        }));

        setCollaborativeFolders(converted);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user]);

  return { collaborativeFolders, loading, error };
}

