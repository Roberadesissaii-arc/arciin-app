export function generateUniqueId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const random2 = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${random}-${random2}`;
}

/**
 * Clean AI-generated HTML/CSS artifacts from the message content
 * Removes any pre-existing class names or HTML that the AI might have incorrectly generated
 */
export function cleanAIHTMLArtifacts(content: string): string {
  // Remove any HTML/CSS class strings that the AI might have generated
  // Pattern: "class-name class-name..."> or 'class-name class-name...'>
  let cleaned = content.replace(/"[\w\-\s\/\[\]]+(?:from|to|via|bg|text|font|gradient)[\w\-\s\/\[\]]*">/g, '"');
  cleaned = cleaned.replace(/'[\w\-\s\/\[\]]+(?:from|to|via|bg|text|font|gradient)[\w\-\s\/\[\]]*'>/g, "'");
  
  // Remove CSS class strings that appear in quotes before text (e.g., "font-bold...">Name)
  // This catches patterns like: "font-bold text-lg bg-gradient-to-r from-indigo-600...">Tom Holland!
  // Match: quote, CSS classes (with spaces, hyphens, etc.), closing quote, >, then text
  cleaned = cleaned.replace(/"[\w\-\s\/\[\]]*(?:font|bg|text|gradient|indigo|purple|via|from|to|clip|bold|semibold|transparent)[\w\-\s\/\[\]]*">/gi, '"');
  
  // Remove CSS class strings that appear without quotes (e.g., font-bold text-lg...>Name)
  cleaned = cleaned.replace(/[\w\-\s\/\[\]]*(?:font|bg|text|gradient|indigo|purple|via|from|to|clip|bold|semibold|transparent)[\w\-\s\/\[\]]*">/gi, '');
  
  // Remove patterns where CSS classes appear in the middle of text
  // Pattern: "about "font-bold..." followed by > and name (e.g., "Let me tell about "font-bold...">Tom")
  cleaned = cleaned.replace(/(about|tell)\s+"[\w\-\s\/\[\]]*(?:font|bg|text|gradient|indigo|purple|via|from|to|clip|bold|semibold|transparent)[\w\-\s\/\[\]]*">([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi, '$1 $2');
  
  // Pattern: any word followed by "font-bold..." followed by > and more text
  cleaned = cleaned.replace(/(\w+)\s+"[\w\-\s\/\[\]]*(?:font|bg|text|gradient|indigo|purple|via|from|to|clip|bold|semibold|transparent)[\w\-\s\/\[\]]*">(\w+)/gi, '$1 $2');
  
  // Remove incomplete HTML tags like <span class="..."> or </span>
  cleaned = cleaned.replace(/<\/?span[^>]*>/g, '');
  
  // Remove any stray closing >
  cleaned = cleaned.replace(/^>/gm, '');
  
  // Remove any remaining CSS class patterns that might appear in text
  // Pattern: class names followed by > (e.g., "font-bold...">)
  cleaned = cleaned.replace(/(?:^|\s)"[\w\-\s\/\[\]]*(?:font|bg|text|gradient|indigo|purple|via|from|to|clip|bold|semibold|transparent)[\w\-\s\/\[\]]*">/gi, ' "');
  
  return cleaned;
}

export function formatMessageWithGradientTitles(content: string): string {
  // First, clean any HTML/CSS artifacts the AI might have generated
  let cleanedContent = cleanAIHTMLArtifacts(content);
  
  // Format person names: "Person Name" at the start of a sentence or after "about"
  // Pattern: "Let me tell you about Person Name!" or "Person Name is..."
  // Use the SAME gradient as movie titles (indigo)
  cleanedContent = cleanedContent.replace(
    /(?:about|you about)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)!/g,
    'about <span class="font-bold text-lg bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 bg-clip-text text-transparent">$1</span>!'
  );
  
  // Also catch person names at the beginning of responses
  cleanedContent = cleanedContent.replace(
    /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s+is\s+a/gm,
    '<span class="font-bold text-lg bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 bg-clip-text text-transparent">$1</span> is a'
  );
  
  // 🎨 Color all quoted text (key information) - must be done BEFORE movie entry formatting
  // Pattern: "Any text in quotes" - these are key pieces of information
  // Use indigo gradient to match the app's consistent styling
  // Simple pattern that works in all JavaScript environments
  cleanedContent = cleanedContent.replace(
    /"([^"]+)"/g,
    '<span class="font-semibold bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 bg-clip-text text-transparent">"$1"</span>'
  );
  
  // Format movie entries: "Title" (Year) - Description
  // Pattern: "Movie Title" (2025) - Description text
  // Simple list with very minimal padding between movies
  // Note: This will re-format the already-colored quotes, but that's okay for movie entries
  cleanedContent = cleanedContent.replace(
    /<span class="font-semibold bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 bg-clip-text text-transparent">"([^"]+)"<\/span>\s*\((\d{4})\)\s*-\s*/g,
    '<div class="mb-1 text-gray-300 text-sm leading-relaxed">• <span class="font-semibold bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 bg-clip-text text-transparent">"$1"</span> ($2) - '
  );
  
  // Close the div before the next entry or at paragraph breaks
  cleanedContent = cleanedContent.replace(/\n\n/g, '</div>\n\n');
  
  // Apply gradient styling to remaining markdown bold titles (**Title**)
  cleanedContent = cleanedContent.replace(
    /\*\*([^\*]+)\*\*/g,
    '<span class="font-bold bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 bg-clip-text text-transparent">$1</span>'
  );
  
  // Remove remaining markdown formatting symbols
  // Remove __ for bold
  cleanedContent = cleanedContent.replace(/__([^_]+)__/g, '$1');
  // Remove single _ for italic
  cleanedContent = cleanedContent.replace(/_([^_]+)_/g, '<em>$1</em>');
  // Remove single * for italic
  cleanedContent = cleanedContent.replace(/\*([^\*]+)\*/g, '<em>$1</em>');
  
  // Ensure all opened divs are closed at the end
  const openDivs = (cleanedContent.match(/<div class="mb-1 text-gray-300 text-sm leading-relaxed">/g) || []).length;
  const closedDivs = (cleanedContent.match(/<\/div>/g) || []).length;
  const unclosedDivs = openDivs - closedDivs;
  
  for (let i = 0; i < unclosedDivs; i++) {
    cleanedContent += '</div>';
  }
  
  return cleanedContent;
}

/**
 * Extract movie/TV show titles mentioned in AI response text
 * Looks for titles in quotes like "Movie Title" (2024)
 */
export function extractMentionedTitles(content: string): string[] {
  const titles: string[] = [];
  
  // Match patterns like "Title" (year) or just "Title"
  const quotePattern = /"([^"]+)"\s*(?:\((\d{4})\))?/g;
  let match;
  
  while ((match = quotePattern.exec(content)) !== null) {
    const title = match[1].trim();
    if (title && title.length > 2) { // Avoid single letters
      titles.push(title);
    }
  }
  
  return titles;
}

/**
 * Filter media items to only those mentioned in the AI response
 * Returns items in the order they were mentioned
 */
export function filterMentionedMedia<T extends { title?: string; name?: string }>(
  allMedia: T[],
  aiResponse: string
): T[] {
  const mentionedTitles = extractMentionedTitles(aiResponse);
  
  if (mentionedTitles.length === 0) {
    // If no titles extracted, return all (fallback to current behavior)
    return allMedia;
  }
  
  const filteredMedia: T[] = [];
  const usedIndices = new Set<number>();
  
  // For each mentioned title, find matching media item
  for (const mentionedTitle of mentionedTitles) {
    const mentionedLower = mentionedTitle.toLowerCase();
    
    // Find best match in allMedia
    const matchIndex = allMedia.findIndex((item, idx) => {
      if (usedIndices.has(idx)) return false;
      
      const itemTitle = (item.title || item.name || '').toLowerCase();
      
      // Exact match
      if (itemTitle === mentionedLower) return true;
      
      // Contains match
      if (itemTitle.includes(mentionedLower) || mentionedLower.includes(itemTitle)) return true;
      
      // Normalized match (remove special characters)
      const normalizedItem = itemTitle.replace(/[^a-z0-9]/g, '');
      const normalizedMention = mentionedLower.replace(/[^a-z0-9]/g, '');
      if (normalizedItem === normalizedMention) return true;
      
      return false;
    });
    
    if (matchIndex !== -1) {
      filteredMedia.push(allMedia[matchIndex]);
      usedIndices.add(matchIndex);
    }
  }
  
  return filteredMedia.length > 0 ? filteredMedia : allMedia;
}

