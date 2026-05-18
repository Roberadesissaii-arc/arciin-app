import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getPendingFolderInvites } from '@/lib/firebase/folderSharing';

export function usePendingFolderInvites() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCount = async () => {
      if (!user) {
        setCount(0);
        setLoading(false);
        return;
      }

      try {
        const invites = await getPendingFolderInvites(user.uid);
        setCount(invites.length);
      } catch (error) {
        setCount(0);
      } finally {
        setLoading(false);
      }
    };

    loadCount();
  }, [user]);

  return { count, loading };
}
