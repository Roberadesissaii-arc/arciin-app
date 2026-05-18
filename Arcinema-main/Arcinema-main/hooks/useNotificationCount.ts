// hooks/useNotificationCount.ts
import { useState, useEffect } from 'react';
import { onSnapshot, query, collection, where } from 'firebase/firestore';
import { projectFirestore as db } from '@/firebase/config';
import { useAuth } from '@/contexts/AuthContext';

export function useNotificationCount() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.uid) {
      setUnreadCount(0);
      return;
    }

    // Set up real-time listener for unread notifications
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      where('isRead', '==', false)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const count = querySnapshot.size;
      setUnreadCount(count);
    }, (error) => {
    });

    return () => unsubscribe();
  }, [user?.uid]);

  return unreadCount;
}
