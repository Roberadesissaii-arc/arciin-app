// hooks/useNotifications.ts
import { useState, useEffect } from 'react';
import { onSnapshot, query, collection, where, orderBy } from 'firebase/firestore';
import { projectFirestore as db } from '@/firebase/config';
import { useAuth } from '@/contexts/AuthContext';
import { Notification } from '@/types/notification';
import { notificationService } from '@/lib/features/notifications/notificationService';

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    // Set up real-time listener for notifications
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const notificationsList: Notification[] = [];
        let unreadCounter = 0;

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const notification: Notification = {
            id: doc.id,
            ...data,
            // createdAt is stored as ISO string, convert to Date
            createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
          } as Notification;

          notificationsList.push(notification);
          
          if (!notification.isRead) {
            unreadCounter++;
          }
        });

        setNotifications(notificationsList);
        setUnreadCount(unreadCounter);
        setLoading(false);
      },
      (error) => {
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user?.uid]);

  const markAsRead = async (notificationId: string) => {
    await notificationService.markAsRead(notificationId);
  };

  const markAllAsRead = async () => {
    if (user?.uid) {
      await notificationService.markAllAsRead(user.uid);
    }
  };

  const createTestNotification = async () => {
    if (user?.uid) {
      await notificationService.createTestNotification(user.uid);
    }
  };

  const checkForNewReleases = async () => {
    if (user?.uid) {
      return await notificationService.checkForNewReleases(user.uid);
    }
    return [];
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    createTestNotification,
    checkForNewReleases,
  };
}
