// components/search/SearchInput.tsx
"use client";

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  X,
  Clock,
  Loader2,
  Film,
  Tv,
  User
} from 'lucide-react';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import { useAutoComplete } from '@/hooks/useAutoComplete';
import { useUserSettings } from '@/hooks/useUserSettings';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

interface SearchInputProps {
  initialValue?: string;
  onSearch?: (query: string) => void;
  placeholder?: string;
  className?: string;
}

export default function SearchInput({
  initialValue = '',
  onSearch,
  placeholder = 'Search movies, shows & people...',
  className = '',
}: SearchInputProps) {
  const [query, setQuery] = useState(initialValue);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { settings } = useUserSettings();
  
  const { history, addSearch } = useSearchHistory();
  const contentFilter = settings?.preferences?.contentFilter || 'filtered';
  
  // Get recent searches for empty query
  const recentSearches = history.slice(0, 3);
  
  // Auto-complete hook for live suggestions
  const {
    suggestions: autoCompleteSuggestions,
    isLoading: isAutoCompleteLoading,
    getSuggestions: getAutoCompleteSuggestions,
    clearSuggestions: clearAutoCompleteSuggestions
  } = useAutoComplete({
    contentFilter,
    debounceMs: 300,
    maxResults: 6
  });

  // Handle query changes and trigger auto-complete
  const handleQueryChange = (value: string) => {
    setQuery(value);
    setFocusedIndex(-1);
    
    // Trigger auto-complete for new queries
    if (value.trim().length >= 2) {
      getAutoCompleteSuggestions(value);
      setShowSuggestions(true);
    } else {
      clearAutoCompleteSuggestions();
      setShowSuggestions(false);
    }
  };

  // Handle clicks outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-focus on mobile when component mounts
  useEffect(() => {
    // Small delay to ensure the page has loaded
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  const handleFocus = () => {
    // Only show suggestions if there's content in the input or recent searches
    if (query.trim().length >= 2 || recentSearches.length > 0) {
      setShowSuggestions(true);
    }
    setFocusedIndex(-1);
  };

  const handleBlur = () => {
    // Small delay to allow click events on suggestions to work
    setTimeout(() => {
      setShowSuggestions(false);
      setFocusedIndex(-1);
    }, 150);
  };

  const handleSearch = (searchQuery: string) => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) return;

    addSearch(trimmedQuery);
    setShowSuggestions(false);
    setFocusedIndex(-1);
    clearAutoCompleteSuggestions();

    if (onSearch) {
      onSearch(trimmedQuery);
    } else {
      router.push(`/search?q=${encodeURIComponent(trimmedQuery)}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => 
          prev < autoCompleteSuggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => 
          prev > 0 ? prev - 1 : autoCompleteSuggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && autoCompleteSuggestions[focusedIndex]) {
          const suggestion = autoCompleteSuggestions[focusedIndex];
          setQuery(suggestion.title);
          handleSearch(suggestion.title);
        } else {
          handleSearch(query);
        }
        // Always blur the input and hide suggestions after Enter
        inputRef.current?.blur();
        setShowSuggestions(false);
        break;
      case 'Escape':
        setShowSuggestions(false);
        setFocusedIndex(-1);
        clearAutoCompleteSuggestions();
        inputRef.current?.blur();
        break;
    }
  };

  const handleSuggestionClick = (suggestion: any) => {
    const searchQuery = suggestion.title;
    setQuery(searchQuery);
    handleSearch(searchQuery);
  };



  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'movie': return <Film className="w-4 h-4" />;
      case 'tv': return <Tv className="w-4 h-4" />;
      case 'person': return <User className="w-4 h-4" />;
      default: return <Search className="w-4 h-4" />;
    }
  };

  return (
    <div className={`relative w-full max-w-2xl ${className}`}>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-12 pr-12 py-3 md:py-4 bg-black/30 backdrop-blur-xl border border-white/20 rounded-xl md:rounded-2xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400/50 transition-all duration-300 text-white placeholder-gray-400 font-medium text-sm md:text-base"
        />
        {query && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 h-8 w-8 text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            onClick={() => {
              setQuery('');
              setShowSuggestions(false);
              clearAutoCompleteSuggestions();
              inputRef.current?.focus();
            }}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <AnimatePresence>
        {showSuggestions && (
          <motion.div
            ref={suggestionsRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute left-0 right-0 top-full mt-3 bg-black/40 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden shadow-2xl z-50 max-h-[70vh] overflow-y-auto text-left"
          >
            {!query.trim() ? (
              // Show recent searches or placeholder when no query
              <>
                {recentSearches.length > 0 ? (
                  <>
                    <div className="p-3 border-b border-white/10 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-300">Recent Searches</span>
                    </div>
                    <div>
                      {recentSearches.map((search, index) => (
                        <motion.div
                          key={search.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.03 }}
                          onClick={() => {
                            setQuery(search.query);
                            handleSearch(search.query);
                          }}
                          className="flex items-center gap-3 p-3 hover:bg-white/10 cursor-pointer transition-colors border-b border-white/5 last:border-b-0"
                        >
                          <div className="w-10 h-14 bg-white/5 rounded flex items-center justify-center flex-shrink-0">
                            <Search className="w-4 h-4 text-gray-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-white text-sm font-medium truncate">{search.query}</h4>
                            <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                              <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px]">Recent</span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="p-6 text-center text-gray-400">
                    <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Start typing to search movies, shows & people</p>
                  </div>
                )}
              </>
            ) : query.trim().length >= 2 ? (
              // Show autocomplete suggestions when typing
              autoCompleteSuggestions.length > 0 || isAutoCompleteLoading ? (
                <>
                  <div className="p-3 border-b border-white/10 flex items-center gap-2">
                    <Search className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-300">Suggestions</span>
                    {isAutoCompleteLoading && <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />}
                  </div>
                  <div>
                    {autoCompleteSuggestions.map((suggestion, index) => (
                      <motion.div
                        key={suggestion.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="flex items-center gap-3 p-3 hover:bg-white/10 cursor-pointer transition-colors border-b border-white/5 last:border-b-0"
                      >
                        {suggestion.image ? (
                          <div className="relative w-10 h-14 flex-shrink-0 rounded overflow-hidden">
                            <Image
                              src={suggestion.image}
                              alt={suggestion.title}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-14 bg-white/5 rounded flex items-center justify-center flex-shrink-0">
                            {getTypeIcon(suggestion.type)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-white text-sm font-medium truncate">{suggestion.title}</h4>
                          <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                            <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] flex items-center gap-1">
                              {getTypeIcon(suggestion.type)}
                              <span className="capitalize">{suggestion.type}</span>
                            </span>
                            {suggestion.year && <span>{suggestion.year}</span>}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="p-6 text-center text-gray-400">
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Press Enter to search for "{query}"</p>
                </div>
              )
            ) : (
              // Show placeholder for 1 character
              <div className="p-6 text-center text-gray-400">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Keep typing to see suggestions</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
