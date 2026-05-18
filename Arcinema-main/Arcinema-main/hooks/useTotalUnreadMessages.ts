import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  collection, 
  query, 
  where, 
  onSnapshot 
} from 'firebase/firestore';
import { projectFirestore } from '@/firebase/config';

/**
 * Hook to get total unread message count across all conversations
 * @returns The total count of unread messages from all conversations
 */
export function useTotalUnreadMessages(): number {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.uid) {
      setUnreadCount(0);
      return;
    }

    // Query for all unread messages where current user is receiver
    const messagesQuery = query(
      collection(projectFirestore, 'messages'),
      where('receiverId', '==', user.uid),
      where('read', '==', false)
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      setUnreadCount(snapshot.size);
    }, (error) => {
      console.error('Error loading total unread messages:', error);
      setUnreadCount(0);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  return unreadCount;
}

