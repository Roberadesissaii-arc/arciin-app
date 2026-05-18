// lib/searchUtils.ts

/**
 * Enhanced word matching for search queries
 */
export function improveWordMatching(query: string, title: string, overview: string): boolean {
  if (!query || !title) return false;

  // Convert to lowercase for case-insensitive matching
  const lowerQuery = query.toLowerCase().trim();
  const lowerTitle = title.toLowerCase();
  const lowerOverview = overview?.toLowerCase() || '';

  // If query is empty after trimming, don't match
  if (!lowerQuery) return false;

  // Split query into individual words
  const queryWords = lowerQuery.split(/\s+/).filter(word => word.length > 0);
  
  // Check if all query words are found as whole words in title or overview
  return queryWords.every(word => {
    // Create regex for whole word matching
    const wordRegex = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i');
    
    // Check if word exists as a whole word in title or overview
    return wordRegex.test(lowerTitle) || wordRegex.test(lowerOverview);
  });
}

/**
 * Escape special regex characters
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Score search results based on relevance
 */
export function scoreSearchResult(query: string, title: string, overview: string, popularity: number = 0): number {
  if (!query || !title) return 0;

  const lowerQuery = query.toLowerCase().trim();
  const lowerTitle = title.toLowerCase();
  const lowerOverview = overview?.toLowerCase() || '';
  
  let score = 0;

  // Exact title match gets highest score
  if (lowerTitle === lowerQuery) {
    score += 1000;
  }
  // Title starts with query gets high score
  else if (lowerTitle.startsWith(lowerQuery)) {
    score += 500;
  }
  // Title contains query gets medium score
  else if (lowerTitle.includes(lowerQuery)) {
    score += 100;
  }

  // Split query into words for partial matching
  const queryWords = lowerQuery.split(/\s+/).filter(word => word.length > 0);
  
  queryWords.forEach(word => {
    const wordRegex = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i');
    
    // Whole word matches in title
    if (wordRegex.test(lowerTitle)) {
      score += 50;
    }
    
    // Whole word matches in overview
    if (wordRegex.test(lowerOverview)) {
      score += 10;
    }
    
    // Partial matches (lower score)
    if (lowerTitle.includes(word)) {
      score += 5;
    }
    
    if (lowerOverview.includes(word)) {
      score += 2;
    }
  });

  // Add popularity boost (scaled down to not overwhelm relevance)
  score += (popularity || 0) * 0.1;

  return score;
}

/**
 * Filter and sort search results by relevance
 */
export function filterAndSortResults<T extends { title?: string; name?: string; overview: string; popularity?: number }>(
  results: T[],
  query: string
): T[] {
  if (!query.trim()) return results;

  // First filter to only include relevant results
  const relevantResults = results.filter(item => {
    const title = item.title || item.name || '';
    return improveWordMatching(query, title, item.overview);
  });

  // Then score and sort by relevance
  const scoredResults = relevantResults.map(item => ({
    ...item,
    relevanceScore: scoreSearchResult(
      query,
      item.title || item.name || '',
      item.overview,
      item.popularity
    ),
  }));

  // Sort by relevance score (descending)
  scoredResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // Remove the relevanceScore property before returning
  return scoredResults.map(({ relevanceScore, ...item }) => item as unknown as T);
}
