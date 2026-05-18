// lib/notificationInit.ts
import { notificationService } from './notificationService';

class NotificationInitService {
  private initialized = false;
  private lastCheckDate: string | null = null;

  async initialize(userId: string) {
    if (this.initialized) return;
    
    
    // Check if we've already checked today
    const today = new Date().toISOString().split('T')[0];
    
    if (this.lastCheckDate !== today) {
      // Check for new releases in the background
      setTimeout(async () => {
        try {
          const newNotifications = await notificationService.checkForNewReleases(userId);
          this.lastCheckDate = today;
        } catch (error) {
        }
      }, 5000); // Wait 5 seconds after app load
    }
    
    this.initialized = true;
  }

  reset() {
    this.initialized = false;
    this.lastCheckDate = null;
  }
}

export const notificationInitService = new NotificationInitService();
