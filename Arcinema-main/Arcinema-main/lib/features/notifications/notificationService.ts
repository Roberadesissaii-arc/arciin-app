// lib/notificationService.ts
import { collection, addDoc, query, where, getDocs, orderBy, doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { projectFirestore as db } from '@/firebase/config';
import { Notification, NewRelease } from '@/types/notification';
import { emailNotificationService } from './emailNotificationService';

class NotificationService {
  // Create a new notification
  async createNotification(userId: string, type: Notification['type'], title: string, message: string, movieData?: { id: number; title: string; poster?: string }) {
    try {
      const notificationData = {
        userId,
        type,
        title,
        message,
        movieData: movieData ? {
          id: movieData.id,
          title: movieData.title,
          poster_path: movieData.poster
        } : null,
        isRead: false,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'notifications'), notificationData);

      // Send email notification if user has email notifications enabled
      if (movieData && type === 'new_release') {
        this.sendEmailNotification(userId, movieData);
      }

      return docRef.id;
    } catch (error) {
      return null;
    }
  }

  // Send email notification for a specific user
  private async sendEmailNotification(userId: string, movieData: { id: number; title: string; poster?: string }) {
    // Only run on server side
    if (typeof window !== 'undefined') {
      return; // Skip on client side
    }

    try {
      // Get user's notification settings
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (!userDoc.exists()) {
        return;
      }

      const userData = userDoc.data();
      const notifications = userData.notifications || {};

      // Check if user has email notifications enabled
      if (notifications.email === true && notifications.newReleases === true && userData.email) {
        // Send email via n8n webhook
        await emailNotificationService.notifyUser(userId, {
          title: movieData.title,
          poster: movieData.poster,
          id: movieData.id
        });
      }
    } catch (error) {
      // Silently fail - email notifications are optional
      if (process.env.NODE_ENV === 'development') {
      }
    }
  }

  // Get notifications for a user
  async getUserNotifications(userId: string): Promise<Notification[]> {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const notifications: Notification[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        notifications.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
        } as Notification);
      });

      return notifications;
    } catch (error) {
      return [];
    }
  }

  // Mark notification as read
  async markAsRead(notificationId: string) {
    try {
      const docRef = doc(db, 'notifications', notificationId);
      await updateDoc(docRef, { isRead: true });
    } catch (error) {
    }
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId: string) {
    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('isRead', '==', false)
      );

      const querySnapshot = await getDocs(q);
      const updatePromises = querySnapshot.docs.map(doc => 
        updateDoc(doc.ref, { isRead: true })
      );

      await Promise.all(updatePromises);
    } catch (error) {
    }
  }

  // Check for new movie releases and create notifications
  async checkForNewReleases(userId: string) {
    try {
      const API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
      if (!API_KEY) {
        return [];
      }

      // Get current date and date 7 days ago for recent releases
      const today = new Date();
      const weekAgo = new Date();
      weekAgo.setDate(today.getDate() - 7);

      const todayStr = today.toISOString().split('T')[0];
      const weekAgoStr = weekAgo.toISOString().split('T')[0];

      // Fetch movies released in the last week
      const response = await fetch(
        `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&primary_release_date.gte=${weekAgoStr}&primary_release_date.lte=${todayStr}&sort_by=popularity.desc&vote_average.gte=6.0&page=1`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch from TMDB');
      }

      const data = await response.json();
      const newMovies = data.results?.slice(0, 3) || []; // Get top 3 new releases

      // Check which movies we haven't notified about yet
      const existingNotificationsQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('type', '==', 'new_release'),
        orderBy('createdAt', 'desc')
      );

      const existingNotifications = await getDocs(existingNotificationsQuery);
      const notifiedMovieIds = new Set(
        existingNotifications.docs
          .map(doc => doc.data().movieData?.id)
          .filter(Boolean)
      );

      // Create notifications for new movies we haven't notified about
      const notifications = await Promise.all(
        newMovies.map(async (movie: any) => {
          if (!notifiedMovieIds.has(movie.id)) {
            return this.createNotification(
              userId,
              'new_release',
              '🎬 New Movie Released!',
              `${movie.title} is now available to watch`,
              {
                id: movie.id,
                title: movie.title,
                poster: movie.poster_path
              }
            );
          }
          return null;
        })
      );

      const successfulNotifications = notifications.filter(id => id !== null);
      
      return successfulNotifications;
    } catch (error) {
      return [];
    }
  }

  // Create a test notification (for testing purposes)
  async createTestNotification(userId: string) {
    const testMovies = [
      { id: 1, title: 'Deadpool & Wolverine', poster: '/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg' },
      { id: 2, title: 'Inside Out 2', poster: '/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg' },
      { id: 3, title: 'Bad Boys: Ride or Die', poster: '/nP6RliHjxsU3rZbvq9hqKZEGSKj.jpg' }
    ];

    const randomMovie = testMovies[Math.floor(Math.random() * testMovies.length)];
    
    return this.createNotification(
      userId,
      'new_release',
      '🔥 Hot New Release!',
      `${randomMovie.title} just dropped and it's getting amazing reviews!`,
      randomMovie
    );
  }
}

export const notificationService = new NotificationService();
