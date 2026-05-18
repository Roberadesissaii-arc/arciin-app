// lib/notificationChecker.ts
import { collection, query, where, getDocs, doc, updateDoc, addDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { projectFirestore as db } from '@/firebase/config';
import { emailNotificationService } from './emailNotificationService';

interface PendingNotification {
  id: string;
  userId: string;
  movieData: {
    id: number;
    title: string;
    poster_path?: string;
  };
  releaseDate: string;
  createdAt: any;
}

export class NotificationChecker {
  // Check for movies that are released today and send notifications
  async checkAndSendReleaseNotifications(): Promise<void> {
    try {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      // Get all pending release notifications
      const q = query(
        collection(db, 'notifications'),
        where('type', '==', 'reminder'),
        where('isRead', '==', false)
      );

      const snapshot = await getDocs(q);
      const pendingNotifications: PendingNotification[] = [];

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.movieData?.id) {
          pendingNotifications.push({
            id: doc.id,
            ...data
          } as PendingNotification);
        }
      });
      // Check each movie's release date
      for (const notification of pendingNotifications) {
        await this.checkMovieReleaseStatus(notification, todayStr);
      }

    } catch (error) {
    }
  }

  private async checkMovieReleaseStatus(notification: PendingNotification, todayStr: string): Promise<void> {
    try {
      const API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
      if (!API_KEY) {
        return;
      }

      // Fetch movie details from TMDB
      const response = await fetch(
        `https://api.themoviedb.org/3/movie/${notification.movieData.id}?api_key=${API_KEY}`
      );

      if (!response.ok) {
        return;
      }

      const movieData = await response.json();
      const releaseDate = movieData.release_date;

      if (releaseDate === todayStr) {
        // Movie is released today! Send notification
        await this.sendReleaseNotification(notification, movieData);
        await this.markNotificationAsProcessed(notification.id);
      } else if (new Date(releaseDate) < new Date(todayStr)) {
        // Movie was released in the past, mark as processed
        await this.markNotificationAsProcessed(notification.id);
      }
    } catch (error) {
    }
  }

  private async sendReleaseNotification(notification: PendingNotification, movieData: any): Promise<void> {
    try {
      // Create a new "movie is now available" notification
      await addDoc(collection(db, 'notifications'), {
        userId: notification.userId,
        type: 'new_release',
        title: '🎬 Movie Now Available!',
        message: `"${movieData.title}" is now released and available to watch!`,
        movieData: {
          id: movieData.id,
          title: movieData.title,
          poster_path: movieData.poster_path
        },
        isRead: false,
        createdAt: serverTimestamp()
      });

      // Send email notification if user has email notifications enabled
      await this.sendEmailNotificationToUser(notification.userId, movieData);
    } catch (error) {
    }
  }

  private async sendEmailNotificationToUser(userId: string, movieData: any): Promise<void> {
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
          year: movieData.release_date ? new Date(movieData.release_date).getFullYear().toString() : undefined,
          description: movieData.overview,
          poster: movieData.poster_path,
          id: movieData.id,
          releaseDate: movieData.release_date
        });
      }
    } catch (error) {
    }
  }

  private async markNotificationAsProcessed(notificationId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), {
        isRead: true,
        processedAt: serverTimestamp()
      });
    } catch (error) {
    }
  }

  // Manual trigger for testing
  async triggerReleaseCheck(): Promise<void> {
    await this.checkAndSendReleaseNotifications();
  }
}

export const notificationChecker = new NotificationChecker();
