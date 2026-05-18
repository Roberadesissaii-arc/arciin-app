// hooks/useSearchHistory.ts
import { useState, useEffect } from 'react';
import { isSearchQueryAppropriate } from '@/lib/features/filters/contentFilter';

const SEARCH_HISTORY_KEY = 'search_history';
const MAX_HISTORY_ITEMS = 10;

export interface SearchHistoryItem {
  id: string;
  query: string;
  timestamp: number;
}

export function useSearchHistory() {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);

  // Load history from localStorage on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem(SEARCH_HISTORY_KEY);
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        setHistory(parsed);
      } catch (error) {
      }
    }
  }, []);

  // Add search to history
  const addSearch = (query: string) => {
    if (!query.trim()) return;

    const newItem: SearchHistoryItem = {
      id: `${Date.now()}-${Math.random()}`,
      query: query.trim(),
      timestamp: Date.now(),
    };

    setHistory(prev => {
      // Remove any existing entries with the same query
      const filtered = prev.filter(item => 
        item.query.toLowerCase() !== query.toLowerCase()
      );
      
      // Add new item to the beginning
      const newHistory = [newItem, ...filtered].slice(0, MAX_HISTORY_ITEMS);
      
      // Save to localStorage
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
      
      return newHistory;
    });
  };

  // Remove specific search from history
  const removeSearch = (id: string) => {
    setHistory(prev => {
      const newHistory = prev.filter(item => item.id !== id);
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
      return newHistory;
    });
  };

  // Clear all search history
  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(SEARCH_HISTORY_KEY);
  };

  // Get filtered suggestions based on current input and content filter
  const getSuggestions = (query: string, contentFilter?: 'all' | 'filtered' | 'kids'): SearchHistoryItem[] => {
    if (!query.trim()) {
      // Filter history based on content filter level
      if (contentFilter === 'kids' || contentFilter === 'filtered') {
        return history.filter(item => 
          isSearchQueryAppropriate(item.query, contentFilter || 'filtered')
        );
      }
      return history;
    }
    
    const lowercaseQuery = query.toLowerCase();
    let filteredHistory = history.filter(item =>
      item.query.toLowerCase().includes(lowercaseQuery)
    );
    
    // Apply content filtering
    if (contentFilter === 'kids' || contentFilter === 'filtered') {
      filteredHistory = filteredHistory.filter(item => 
        isSearchQueryAppropriate(item.query, contentFilter)
      );
    }
    
    return filteredHistory;
  };

  return {
    history,
    addSearch,
    removeSearch,
    clearHistory,
    getSuggestions,
  };
}
