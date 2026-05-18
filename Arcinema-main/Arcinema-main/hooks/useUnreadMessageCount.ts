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
 * Hook to get unread message count for a specific user conversation
 * @param otherUserId - The ID of the other user in the conversation
 * @returns The count of unread messages from that user
 */
export function useUnreadMessageCount(otherUserId: string | null): number {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.uid || !otherUserId) {
      setUnreadCount(0);
      return;
    }

    const conversationId = [user.uid, otherUserId].sort().join('_');
    
    // Query for unread messages where current user is receiver
    const messagesQuery = query(
      collection(projectFirestore, 'messages'),
      where('conversationId', '==', conversationId),
      where('receiverId', '==', user.uid),
      where('read', '==', false)
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      setUnreadCount(snapshot.size);
    }, (error) => {
      console.error('Error loading unread count:', error);
      setUnreadCount(0);
    });

    return () => unsubscribe();
  }, [user?.uid, otherUserId]);

  return unreadCount;
}

