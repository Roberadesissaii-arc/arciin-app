// lib/emailNotificationService.ts
import { collection, query, where, getDocs } from 'firebase/firestore';
import { projectFirestore as db } from '@/firebase/config';
import { formatReleaseDate } from '../../utils/dateUtils';

interface MovieNotification {
  title: string;
  year?: string;
  description?: string;
  poster?: string;
  id?: number;
  releaseDate?: string;
}

// Dynamically import DeepSeek only on server side
async function enhanceDescription(title: string, year: string, description: string): Promise<string> {
  // Only run on server side
  if (typeof window !== 'undefined') {
    return description; // Return original on client side
  }

  try {
    // Dynamic import to prevent client-side loading
    const { enhanceMovieDescriptionForEmail } = await import('../../services/deepseekService');
    return await enhanceMovieDescriptionForEmail(title, year, description);
  } catch (error) {
    return description; // Fallback to original
  }
}

class EmailNotificationService {
  // Production webhook URL
  private readonly WEBHOOK_URL = 'https://n8n.srv836694.hstgr.cloud/webhook/notify-movie';

  /**
   * Send email notification via n8n webhook with AI-enhanced description
   */
  private async sendEmailViaWebhook(to: string, movie: MovieNotification): Promise<boolean> {
    try {
      // Enhance description using DeepSeek AI (server-side only)
      let enhancedDescription = movie.description || '';
      
      if (movie.description && movie.title && movie.year) {
        try {
          enhancedDescription = await enhanceDescription(
            movie.title,
            movie.year,
            movie.description
          );
        } catch (aiError) {
          enhancedDescription = movie.description;
        }
      }

      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(this.WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to,
          movie: {
            title: movie.title,
            year: movie.year,
            description: enhancedDescription, // Use AI-enhanced description
            poster: movie.poster,
            id: movie.id,
            releaseDate: movie.releaseDate ? formatReleaseDate(movie.releaseDate) : movie.releaseDate // Format date nicely
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return false;
      }

      const result = await response.json();
      return true;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
        } else if (error.message.includes('fetch')) {
        } else {
        }
      } else {
      }
      return false;
    }
  }

  /**
   * Get all users who have email notifications enabled for new releases
   */
  private async getUsersWithEmailNotifications(): Promise<Array<{ uid: string; email: string }>> {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef);
      const querySnapshot = await getDocs(q);
      
      const users: Array<{ uid: string; email: string }> = [];
      
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        const notifications = userData.notifications || {};
        
        // Check if user has email notifications AND new releases enabled
        if (notifications.email === true && notifications.newReleases === true && userData.email) {
          users.push({
            uid: doc.id,
            email: userData.email
          });
        }
      });
      return users;
    } catch (error) {
      return [];
    }
  }

  /**
   * Send new release notification to all subscribed users
   */
  async notifyNewRelease(movie: MovieNotification): Promise<{ success: number; failed: number }> {
    const users = await this.getUsersWithEmailNotifications();
    
    if (users.length === 0) {
      return { success: 0, failed: 0 };
    }

    let successCount = 0;
    let failedCount = 0;

    // Send emails in batches to avoid overwhelming the webhook
    const batchSize = 5;
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      
      const results = await Promise.allSettled(
        batch.map(user => this.sendEmailViaWebhook(user.email, movie))
      );

      results.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          successCount++;
        } else {
          failedCount++;
        }
      });

      // Small delay between batches
      if (i + batchSize < users.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    return { success: successCount, failed: failedCount };
  }

  /**
   * Send test email notification
   */
  async sendTestNotification(email: string, movie?: MovieNotification): Promise<boolean> {
    const testMovie: MovieNotification = movie || {
      title: 'Deadpool & Wolverine',
      year: '2024',
      description: 'Marvel Studios brings the ultimate team-up of Wade Wilson and Logan in an epic adventure that will change the MCU forever.',
      poster: '/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg',
      id: 533535,
      releaseDate: '2024-07-24'
    };

    return this.sendEmailViaWebhook(email, testMovie);
  }

  /**
   * Notify specific user about a new release
   */
  async notifyUser(userId: string, movie: MovieNotification): Promise<boolean> {
    try {
      // Get user's email and notification settings
      const userDoc = await getDocs(
        query(collection(db, 'users'), where('__name__', '==', userId))
      );

      if (userDoc.empty) {
        return false;
      }

      const userData = userDoc.docs[0].data();
      const notifications = userData.notifications || {};

      // Check if user has email notifications enabled
      if (!notifications.email || !notifications.newReleases || !userData.email) {
        return false;
      }

      return this.sendEmailViaWebhook(userData.email, movie);
    } catch (error) {
      return false;
    }
  }
}

export const emailNotificationService = new EmailNotificationService();
