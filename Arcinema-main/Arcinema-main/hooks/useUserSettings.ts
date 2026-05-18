// hooks/useUserSettings.ts
import { useState, useEffect } from 'react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { projectFirestore as db } from '@/firebase/config';
import { useAuth } from '@/contexts/AuthContext';

interface UserSettings {
  notifications: {
    email: boolean;
    push: boolean;
    newReleases: boolean;
    recommendations: boolean;
  };
  preferences: {
    language: string;
    country: string;
    autoplay: boolean;
    contentFilter: 'all' | 'filtered' | 'kids';
    aiModel?: 'grok' | 'deepseek' | 'gpt-3.5' | 'gpt-4' | 'gpt-4o' | 'gpt-4o-mini' | 'claude';
    showSpoilers: boolean;
    aiResultsMax?: number;
    aiResultsMin?: number;
  };
  privacy: {
    showWatchlist: boolean;
    showLikedMovies: boolean;
    showActivity: boolean;
  };
}

const defaultSettings: UserSettings = {
  notifications: {
    email: true,
    push: true,
    newReleases: true,
    recommendations: true,
  },
  preferences: {
    language: 'en',
    country: 'all',
    autoplay: true,
    contentFilter: 'filtered',
    aiModel: 'deepseek',
    showSpoilers: true,
    aiResultsMax: 6,
    aiResultsMin: 2,
  },
  privacy: {
    showWatchlist: true,
    showLikedMovies: true,
    showActivity: true,
  },
};

export function useUserSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setSettings(defaultSettings);
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'users', user.uid),
      (doc) => {
        try {
          if (doc.exists()) {
            const userData = doc.data();
            setSettings({
              notifications: userData.notifications || defaultSettings.notifications,
              preferences: userData.preferences || defaultSettings.preferences,
              privacy: userData.privacy || defaultSettings.privacy,
            });
          } else {
            setSettings(defaultSettings);
          }
        } catch (error) {
          setSettings(defaultSettings);
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        setSettings(defaultSettings);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  return { settings, loading };
}
