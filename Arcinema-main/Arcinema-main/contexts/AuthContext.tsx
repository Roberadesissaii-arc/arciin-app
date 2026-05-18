/* eslint-disable @typescript-eslint/no-explicit-any */
// contexts/AuthContext.tsx
"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { User } from "firebase/auth";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
} from "firebase/auth";
import { doc, setDoc, updateDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { projectAuth, projectFirestore } from "@/firebase/config";
import { useRouter } from "next/navigation";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signInUser: (email: string, password: string) => Promise<void>;
  registerUser: (email: string, password: string, username: string) => Promise<void>;
  logoutUser: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithGithub: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(projectAuth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Check device validity periodically
  useEffect(() => {
    if (!user) return;

    const checkDeviceValidity = async () => {
      try {
        const userDoc = await getDoc(doc(projectFirestore, 'users', user.uid));
        if (!userDoc.exists()) return;

        const userData = userDoc.data();
        
        // IMPORTANT: Only enforce device validation if explicitly enabled
        // This prevents users from being kicked out unexpectedly
        if (userData?.deviceManagementEnabled !== true) {
          // Device management not enabled, skip all checks
          return;
        }

        const deviceId = localStorage.getItem('deviceId');
        const loggedOutDevices = userData?.loggedOutDevices || [];
        
        // Check if this device was explicitly logged out
        const wasLoggedOut = loggedOutDevices.some((d: any) => d.id === deviceId);
        
        if (wasLoggedOut) {
          // Device was explicitly logged out from another session
          await signOut(projectAuth);
          localStorage.removeItem('deviceId');
          router.push('/auth/login?reason=device_removed');
        }
      } catch (error) {
        // Never logout on error - just log it
      }
    };

    // Delay initial check by 5 seconds to avoid interfering with page load
    const initialCheckTimeout = setTimeout(checkDeviceValidity, 5000);

    // Then check every 60 seconds
    const interval = setInterval(checkDeviceValidity, 60000);

    return () => {
      clearTimeout(initialCheckTimeout);
      clearInterval(interval);
    };
  }, [user, router]);

  const registerUser = async (email: string, password: string, username: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await createUserWithEmailAndPassword(projectAuth, email, password);
      
      await updateProfile(res.user, { displayName: username });
      
      // Get random avatar for new user (from animals only)
      const { getRandomAvatar } = await import('@/lib/utils/profileAvatars');
      const randomAvatar = getRandomAvatar();
      
      await setDoc(doc(projectFirestore, 'users', res.user.uid), {
        username,
        email,
        avatarId: randomAvatar.id,
        avatarName: randomAvatar.name,
        createdAt: serverTimestamp(),
        watchlist: [],
        favorites: [],
        watched: [],
        wantToWatch: [],
        recentlyViewed: [],
        activities: [],
        notifications: {
          email: true,
          push: true,
          newReleases: true,
          recommendations: true,
        },
        preferences: {
          language: 'en',
          autoplay: true,
          contentFilter: 'filtered',
        },
        privacy: {
          showWatchlist: true,
          showLikedMovies: true,
          showActivity: true,
          profileVisibility: 'public',
        },
        activitySettings: {
          enableTracking: true,
          autoCleanup: true,
          retentionDays: 30,
        },
      });

      router.push('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const signInUser = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
      await signInWithEmailAndPassword(projectAuth, email, password);
      router.push('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(projectAuth, provider);
      
      // Check if user document already exists
      const userDocRef = doc(projectFirestore, 'users', result.user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        // Get random avatar for new user (from animals only)
        const { getRandomAvatar } = await import('@/lib/utils/profileAvatars');
        const randomAvatar = getRandomAvatar();
        
        // Create user document only if it doesn't exist
        await setDoc(userDocRef, {
          username: result.user.displayName || 'User',
          email: result.user.email,
          avatarId: randomAvatar.id,
          avatarName: randomAvatar.name,
          createdAt: serverTimestamp(),
          watchlist: [],
          favorites: [],
          watched: [],
          wantToWatch: [],
          recentlyViewed: [],
          activities: [],
          notifications: {
            email: true,
            push: true,
            newReleases: true,
            recommendations: true,
          },
          preferences: {
            language: 'en',
            autoplay: true,
            adultContent: false,
          },
          privacy: {
            showWatchlist: true,
            showLikedMovies: true,
            showActivity: true,
            profileVisibility: 'public',
          },
          activitySettings: {
            enableTracking: true,
            autoCleanup: true,
            retentionDays: 30,
          },
        });
      }

      router.push('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Similar implementation for GitHub
  const signInWithGithub = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const provider = new GithubAuthProvider();
      const result = await signInWithPopup(projectAuth, provider);
      
      // Check if user document already exists
      const userDocRef = doc(projectFirestore, 'users', result.user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        // Get random avatar for new user (from animals only)
        const { getRandomAvatar } = await import('@/lib/utils/profileAvatars');
        const randomAvatar = getRandomAvatar();
        
        // Create user document only if it doesn't exist
        await setDoc(userDocRef, {
          username: result.user.displayName || 'User',
          email: result.user.email,
          avatarId: randomAvatar.id,
          avatarName: randomAvatar.name,
          createdAt: serverTimestamp(),
          watchlist: [],
          favorites: [],
          watched: [],
          wantToWatch: [],
          recentlyViewed: [],
          activities: [],
          notifications: {
            email: true,
            push: true,
            newReleases: true,
            recommendations: true,
          },
          preferences: {
            language: 'en',
            autoplay: true,
            adultContent: false,
          },
          privacy: {
            showWatchlist: true,
            showLikedMovies: true,
            showActivity: true,
            profileVisibility: 'public',
          },
          activitySettings: {
            enableTracking: true,
            autoCleanup: true,
            retentionDays: 30,
          },
        });
      }

      router.push('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const logoutUser = async () => {
    try {
      if (user) {
        await updateDoc(doc(projectFirestore, 'users', user.uid), {
          lastActive: serverTimestamp()
        });
      }
      await signOut(projectAuth);
      router.push('/auth/login');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(projectAuth, email);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const value = {
    user,
    loading,
    error,
    signInUser,
    registerUser,
    logoutUser,
    forgotPassword,
    signInWithGoogle,
    signInWithGithub
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};