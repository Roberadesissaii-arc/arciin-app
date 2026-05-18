// lib/cineai/titleMatcher.ts
// Smart title matching with variations and fuzzy search

/**
 * Generate title variations for better matching
 * @param title - Original title
 * @returns Array of title variations to try
 */
export function generateTitleVariations(title: string): string[] {
  const variations = [title]; // Start with original
  const cleaned = title.trim();
  
  // Remove "The" from beginning
  if (cleaned.toLowerCase().startsWith('the ')) {
    variations.push(cleaned.substring(4));
  }
  
  // Add "The" if not present
  if (!cleaned.toLowerCase().startsWith('the ')) {
    variations.push('The ' + cleaned);
  }
  
  // Remove "A" from beginning
  if (cleaned.toLowerCase().startsWith('a ')) {
    variations.push(cleaned.substring(2));
  }
  
  // Remove "An" from beginning
  if (cleaned.toLowerCase().startsWith('an ')) {
    variations.push(cleaned.substring(3));
  }
  
  // Remove special characters
  const noSpecialChars = cleaned.replace(/[^\w\s]/g, '');
  if (noSpecialChars !== cleaned) {
    variations.push(noSpecialChars);
  }
  
  // Remove extra spaces
  const singleSpaced = cleaned.replace(/\s+/g, ' ');
  if (singleSpaced !== cleaned) {
    variations.push(singleSpaced);
  }
  
  // Remove common words that might cause issues
  const withoutCommonWords = cleaned
    .replace(/\b(TV Show|Show|Movie|Film|Series|Called)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (withoutCommonWords && withoutCommonWords !== cleaned) {
    variations.push(withoutCommonWords);
  }
  
  // Return unique variations
  return [...new Set(variations)].filter(v => v.length > 0);
}

/**
 * Extract clean title from user input
 * Removes common phrases like "find me", "the movie called", etc.
 */
export function extractCleanTitle(input: string): string {
  return input
    .replace(/^(can you |could you |please |will you )?/gi, '')
    .replace(/\b(find me|show me|search for|look for|i want to watch|get me|give me)\b/gi, '')
    .replace(/\b(the )?(tv show|show|movie|film|series)\b\s*(called|named)?/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculate similarity score between two strings (0-1)
 * Uses Levenshtein distance for fuzzy matching
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  if (s1 === s2) return 1;
  
  const len1 = s1.length;
  const len2 = s2.length;
  
  if (len1 === 0) return len2 === 0 ? 1 : 0;
  if (len2 === 0) return 0;
  
  // Levenshtein distance
  const matrix: number[][] = [];
  
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  
  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  
  return 1 - distance / maxLen;
}

/**
 * Find best matching results from search results
 * @param results - Search results to filter
 * @param searchTerm - Original search term
 * @param threshold - Minimum similarity score (default: 0.6)
 */
export function findBestMatches<T extends { title?: string; name?: string }>(
  results: T[],
  searchTerm: string,
  threshold: number = 0.6
): { exact: T[]; close: T[]; suggested: T | null } {
  const exact: T[] = [];
  const close: T[] = [];
  let bestMatch: { item: T; score: number } | null = null;
  
  for (const item of results) {
    const itemTitle = (item.title || item.name || '').toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    
    // Exact match
    if (itemTitle === searchLower) {
      exact.push(item);
      continue;
    }
    
    // Calculate similarity
    const similarity = calculateSimilarity(itemTitle, searchLower);
    
    if (similarity >= threshold) {
      close.push(item);
      
      if (!bestMatch || similarity > bestMatch.score) {
        bestMatch = { item, score: similarity };
      }
    }
  }
  
  return {
    exact,
    close,
    suggested: exact.length === 0 && close.length > 0 ? bestMatch?.item || null : null
  };
}
