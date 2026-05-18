// components/NotifyMeButton.tsx
"use client";

import { useState, useEffect } from 'react';
import { Bell, BellOff, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { notificationService } from '@/lib/features/notifications/notificationService';

interface NotifyMeButtonProps {
  movieId: number;
  movieTitle: string;
  releaseDate: string;
  posterPath?: string;
  overview?: string;
  className?: string;
}

export const NotifyMeButton = ({ 
  movieId, 
  movieTitle, 
  releaseDate, 
  posterPath,
  overview,
  className 
}: NotifyMeButtonProps) => {
  const { user } = useAuth();
  const [isNotifying, setIsNotifying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpcoming, setIsUpcoming] = useState(false);

  useEffect(() => {
    // Check if the movie is upcoming (released in the future)
    const today = new Date();
    const release = new Date(releaseDate);
    setIsUpcoming(release > today);

    // Check if user is already set to be notified for this movie
    checkNotificationStatus();
  }, [releaseDate, movieId, user]);

  const checkNotificationStatus = async () => {
    if (!user?.uid) return;

    try {
      const notifications = await notificationService.getUserNotifications(user.uid);
      const hasNotification = notifications.some(notification => 
        notification.type === 'reminder' && 
        notification.movieData?.id === movieId &&
        !notification.isRead
      );
      setIsNotifying(hasNotification);
    } catch (error) {
    }
  };

  const handleNotifyMe = async () => {
    if (!user?.uid) {
      toast({
        title: "Sign in required",
        description: "Please sign in to set up notifications.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      if (isNotifying) {
        // Remove notification reminder (we could implement this later)
        toast({
          title: "Notification removed",
          description: `You won't be notified when "${movieTitle}" is released.`,
        });
        setIsNotifying(false);
      } else {
        // Add notification reminder
        await notificationService.createNotification(
          user.uid,
          'reminder',
          '🔔 Release Reminder Set',
          `You'll be notified when "${movieTitle}" is released on ${new Date(releaseDate).toLocaleDateString()}.`,
          {
            id: movieId,
            title: movieTitle,
            poster: posterPath
          }
        );

        toast({
          title: "Notification set!",
          description: `You'll be notified when "${movieTitle}" is released.`,
        });
        setIsNotifying(true);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to set notification. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Don't show the button if the movie is already released
  if (!isUpcoming) {
    return null;
  }

  // Calculate days until release
  const today = new Date();
  const release = new Date(releaseDate);
  const daysUntil = Math.ceil((release.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <Button
      size="lg"
      variant={isNotifying ? "secondary" : "outline"}
      onClick={handleNotifyMe}
      disabled={isLoading}
      className={cn(
        "w-full sm:w-auto gap-2 border-white/20 text-white hover:bg-white/10 text-sm md:text-base",
        isNotifying && "bg-blue-500/20 border-blue-500/50 text-blue-400",
        className
      )}
    >
      {isNotifying ? (
        <>
          <Check className="w-4 h-4 md:w-5 md:h-5" />
          Notification Set
        </>
      ) : (
        <>
          <Bell className="w-4 h-4 md:w-5 md:h-5" />
          Notify Me ({daysUntil} day{daysUntil !== 1 ? 's' : ''})
        </>
      )}
    </Button>
  );
};
