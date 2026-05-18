// hooks/useAutoComplete.ts
"use client";

import { useState, useCallback, useRef } from 'react';
import { searchMovies, searchTVShows, searchPeople } from '@/lib/api';
import { getFilterConfig } from '@/lib/features/filters/contentFilter';
import type { ContentFilterLevel } from '@/lib/features/filters/contentFilter';

export interface AutoCompleteItem {
  id: string;
  title: string;
  type: 'movie' | 'tv' | 'person';
  year?: string;
  image?: string;
}

interface UseAutoCompleteOptions {
  contentFilter: ContentFilterLevel;
  debounceMs?: number;
  maxResults?: number;
}

export function useAutoComplete({
  contentFilter,
  debounceMs = 300,
  maxResults = 8
}: UseAutoCompleteOptions) {
  const [suggestions, setSuggestions] = useState<AutoCompleteItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>();
  const lastQueryRef = useRef<string>('');

  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }

    // Don't search for the same query again
    if (query === lastQueryRef.current) return;
    lastQueryRef.current = query;

    setIsLoading(true);

    try {
      const filterConfig = getFilterConfig(contentFilter);
      
      // Search for movies, TV shows, and people in parallel
      const [moviesResponse, tvResponse, peopleResponse] = await Promise.all([
        searchMovies(query, filterConfig.includeAdult, 'all', 1).catch(() => ({ results: [] })),
        searchTVShows(query, filterConfig.includeAdult, 'all', 1).catch(() => ({ results: [] })),
        searchPeople(query, filterConfig.includeAdult, 1).catch(() => ({ results: [] }))
      ]);

      const suggestions: AutoCompleteItem[] = [];

      // Add movie suggestions with content filtering
      moviesResponse.results?.slice(0, 3).forEach((movie: any) => {
        // Skip if this movie should be filtered
        if (contentFilter === 'filtered' || contentFilter === 'kids') {
          // Check for adult content using our enhanced detection
          const title = (movie.title || '').toLowerCase();
          const overview = (movie.overview || '').toLowerCase();
          
          // Basic adult content check
          if (movie.adult === true) return;
          
          // Enhanced pattern checking
          const adultPatterns = [
            /\b(porn|sex|adult|xxx|erotic|nude|naked)\b/i,
            /\b(anal|oral|lesbian|gay|bisexual)\b/i,
            /\b(fetish|bdsm|kink|strip|prostitute)\b/i,
            /\b(magazine|playboy|hustler|penthouse)\b/i,
            /\b(filthy|dirty|nasty|wild|kinky)\b/i
          ];
          
          const hasAdultContent = adultPatterns.some(pattern => 
            pattern.test(title) || pattern.test(overview)
          );
          
          if (hasAdultContent) return;
        }
        
        suggestions.push({
          id: `movie-${movie.id}`,
          title: movie.title,
          type: 'movie',
          year: movie.release_date ? new Date(movie.release_date).getFullYear().toString() : undefined,
          image: movie.poster_path ? `https://image.tmdb.org/t/p/w92${movie.poster_path}` : undefined
        });
      });

      // Add TV show suggestions with content filtering
      tvResponse.results?.slice(0, 3).forEach((show: any) => {
        // Skip if this show should be filtered
        if (contentFilter === 'filtered' || contentFilter === 'kids') {
          const title = (show.name || '').toLowerCase();
          const overview = (show.overview || '').toLowerCase();
          
          if (show.adult === true) return;
          
          const adultPatterns = [
            /\b(porn|sex|adult|xxx|erotic|nude|naked)\b/i,
            /\b(anal|oral|lesbian|gay|bisexual)\b/i,
            /\b(fetish|bdsm|kink|strip|prostitute)\b/i,
            /\b(magazine|playboy|hustler|penthouse)\b/i,
            /\b(filthy|dirty|nasty|wild|kinky)\b/i
          ];
          
          const hasAdultContent = adultPatterns.some(pattern => 
            pattern.test(title) || pattern.test(overview)
          );
          
          if (hasAdultContent) return;
        }
        
        suggestions.push({
          id: `tv-${show.id}`,
          title: show.name,
          type: 'tv',
          year: show.first_air_date ? new Date(show.first_air_date).getFullYear().toString() : undefined,
          image: show.poster_path ? `https://image.tmdb.org/t/p/w92${show.poster_path}` : undefined
        });
      });

      // Add people suggestions (less filtering needed for people, but check for blocked persons)
      if (contentFilter !== 'kids') {
        try {
          const { getGloballyBlockedPersons } = await import('@/lib/firebase/contentFilter');
          const blockedPersons = await getGloballyBlockedPersons();
          
          peopleResponse.results?.slice(0, 2).forEach((person: any) => {
            // Skip blocked persons
            if (blockedPersons.has(person.id)) return;
            
            suggestions.push({
              id: `person-${person.id}`,
              title: person.name,
              type: 'person',
              image: person.profile_path ? `https://image.tmdb.org/t/p/w92${person.profile_path}` : undefined
            });
          });
        } catch (error) {
          // Fallback: add persons without blocking check
          peopleResponse.results?.slice(0, 2).forEach((person: any) => {
            suggestions.push({
              id: `person-${person.id}`,
              title: person.name,
              type: 'person',
              image: person.profile_path ? `https://image.tmdb.org/t/p/w92${person.profile_path}` : undefined
            });
          });
        }
      }

      // Remove duplicates and limit total results
      const uniqueSuggestions = suggestions.filter((suggestion, index, self) => 
        index === self.findIndex(s => s.title.toLowerCase() === suggestion.title.toLowerCase())
      );
      
      setSuggestions(uniqueSuggestions.slice(0, maxResults));
    } catch (error) {
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [contentFilter, maxResults]);

  const getSuggestions = useCallback((query: string) => {
    // Clear existing debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // If query is empty, clear suggestions immediately
    if (!query || query.length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    // Set loading state immediately for responsiveness
    setIsLoading(true);

    // Debounce the actual search
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(query);
    }, debounceMs);
  }, [fetchSuggestions, debounceMs]);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setIsLoading(false);
    lastQueryRef.current = '';
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
  }, []);

  return {
    suggestions,
    isLoading,
    getSuggestions,
    clearSuggestions
  };
}
