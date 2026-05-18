// hooks/useNewReleasesBadge.ts
"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { projectFirestore } from '@/firebase/config';

interface NewReleaseCount {
  movies: number;
  tvShows: number;
}

export function useNewReleasesBadge() {
  const { user } = useAuth();
  const [counts, setCounts] = useState<NewReleaseCount>({ movies: 0, tvShows: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setCounts({ movies: 0, tvShows: 0 });
      setLoading(false);
      return;
    }

    const fetchUnreadCounts = async () => {
      try {
        setLoading(true);
        
        // Check localStorage for last viewed time
        const lastViewedMovies = localStorage.getItem(`lastViewed_movies_${user.uid}`);
        const lastViewedTV = localStorage.getItem(`lastViewed_tv_${user.uid}`);
        
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        // Fetch recent movie releases from TMDB
        const movieResponse = await fetch(
          `https://api.themoviedb.org/3/movie/now_playing?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}&language=en-US&page=1&region=US`
        );
        const movieData = await movieResponse.json();
        
        // Fetch recent TV releases from TMDB
        const tvResponse = await fetch(
          `https://api.themoviedb.org/3/tv/airing_today?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}&language=en-US&page=1`
        );
        const tvData = await tvResponse.json();
        
        // Count new releases since last view
        let movieCount = 0;
        let tvCount = 0;
        
        if (lastViewedMovies) {
          const lastViewedDate = new Date(lastViewedMovies);
          movieCount = movieData.results?.filter((movie: any) => {
            const releaseDate = new Date(movie.release_date);
            return releaseDate > lastViewedDate;
          }).length || 0;
        } else {
          // If never viewed, count releases from the last week
          movieCount = movieData.results?.filter((movie: any) => {
            const releaseDate = new Date(movie.release_date);
            return releaseDate > oneWeekAgo;
          }).length || 0;
        }
        
        if (lastViewedTV) {
          const lastViewedDate = new Date(lastViewedTV);
          tvCount = tvData.results?.filter((show: any) => {
            const airDate = new Date(show.first_air_date);
            return airDate > lastViewedDate;
          }).length || 0;
        } else {
          // If never viewed, count releases from the last week
          tvCount = tvData.results?.filter((show: any) => {
            const airDate = new Date(show.first_air_date);
            return airDate > oneWeekAgo;
          }).length || 0;
        }
        
        // Cap at 99 for display purposes
        setCounts({
          movies: Math.min(movieCount, 99),
          tvShows: Math.min(tvCount, 99)
        });
        
      } catch (error) {
        setCounts({ movies: 0, tvShows: 0 });
      } finally {
        setLoading(false);
      }
    };

    fetchUnreadCounts();
    
    // Refresh counts every 5 minutes
    const interval = setInterval(fetchUnreadCounts, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [user]);

  const markAsViewed = (type: 'movies' | 'tvShows') => {
    if (!user) return;
    
    const now = new Date().toISOString();
    localStorage.setItem(`lastViewed_${type}_${user.uid}`, now);
    
    // Reset the count for this type
    setCounts(prev => ({
      ...prev,
      [type === 'movies' ? 'movies' : 'tvShows']: 0
    }));
  };

  return {
    movieCount: counts.movies,
    tvShowCount: counts.tvShows,
    loading,
    markMoviesAsViewed: () => markAsViewed('movies'),
    markTVAsViewed: () => markAsViewed('tvShows')
  };
}
