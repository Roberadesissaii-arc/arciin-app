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
 * Hook to get count of unique conversations (people) with unread messages
 * @returns The count of unique users who have sent unread messages
 */
export function useUnreadConversationsCount(): number {
  const { user } = useAuth();
  const [unreadConversationsCount, setUnreadConversationsCount] = useState(0);

  useEffect(() => {
    if (!user?.uid) {
      setUnreadConversationsCount(0);
      return;
    }

    // Query for all unread messages where current user is receiver
    const messagesQuery = query(
      collection(projectFirestore, 'messages'),
      where('receiverId', '==', user.uid),
      where('read', '==', false)
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      // Count unique senders (conversations) with unread messages
      const uniqueSenders = new Set<string>();
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (data.senderId && data.senderId !== user.uid) {
          uniqueSenders.add(data.senderId);
        }
      });
      setUnreadConversationsCount(uniqueSenders.size);
    }, (error) => {
      console.error('Error loading unread conversations count:', error);
      setUnreadConversationsCount(0);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  return unreadConversationsCount;
}

