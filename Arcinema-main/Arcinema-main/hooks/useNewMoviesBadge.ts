// hooks/useNewMoviesBadge.ts
"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { projectFirestore } from '@/firebase/config';

interface NewMovieInfo {
  movieId: number;
  position: number; // 1, 2, or 3
  notificationId: string;
}

export function useNewMoviesBadge() {
  const { user } = useAuth();
  const [newMovies, setNewMovies] = useState<NewMovieInfo[]>([]);
  const [viewedMovies, setViewedMovies] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!user?.uid) {
      setNewMovies([]);
      return;
    }

    const fetchNewReleaseNotifications = async () => {
      try {
        // Get unread new_release notifications for this user
        const q = query(
          collection(projectFirestore, 'notifications'),
          where('userId', '==', user.uid),
          where('type', '==', 'new_release'),
          where('isRead', '==', false),
          orderBy('createdAt', 'desc'),
          limit(3) // Only get first 3
        );

        const querySnapshot = await getDocs(q);
        const movies: NewMovieInfo[] = [];
        
        let index = 0;
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.movieData?.id) {
            movies.push({
              movieId: data.movieData.id,
              position: index + 1, // 1, 2, or 3
              notificationId: doc.id
            });
            index++;
          }
        });

        setNewMovies(movies);

        // Load viewed movies from localStorage
        const storedViewed = localStorage.getItem(`viewedNewMovies_${user.uid}`);
        if (storedViewed) {
          setViewedMovies(new Set(JSON.parse(storedViewed)));
        }
      } catch (error) {
      }
    };

    fetchNewReleaseNotifications();
  }, [user?.uid]);

  const markMovieAsViewed = (movieId: number) => {
    if (!user?.uid) return;

    const newViewedSet = new Set(viewedMovies);
    newViewedSet.add(movieId);
    setViewedMovies(newViewedSet);

    // Save to localStorage
    localStorage.setItem(
      `viewedNewMovies_${user.uid}`,
      JSON.stringify(Array.from(newViewedSet))
    );

    // Remove from newMovies list
    setNewMovies(prev => prev.filter(m => m.movieId !== movieId));
  };

  const getMovieBadge = (movieId: number): number | null => {
    if (viewedMovies.has(movieId)) return null;
    
    const movie = newMovies.find(m => m.movieId === movieId);
    return movie ? movie.position : null;
  };

  const isNewMovie = (movieId: number): boolean => {
    return !viewedMovies.has(movieId) && newMovies.some(m => m.movieId === movieId);
  };

  return {
    newMovies,
    getMovieBadge,
    isNewMovie,
    markMovieAsViewed
  };
}
