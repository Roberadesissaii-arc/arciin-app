// lib/search/personSearch.ts
import { getFilterConfig, filterSearchResults, isAdultContent, type ContentFilterLevel } from '@/lib/features/filters/contentFilter';
import { getGloballyBlockedPersons } from '@/lib/firebase/contentFilter';
import type { Movie } from './movieSearch';

export interface Person {
  id: number;
  name: string;
  profile_path: string;
  known_for_department: string;
  popularity: number;
  adult?: boolean;
  known_for: Movie[];
}

export interface PersonSearchOptions {
  contentFilter?: ContentFilterLevel;
  includeAdult?: boolean;
}

// Function to normalize and improve search terms for better matching
export const normalizeSearchTerm = (term: string): string[] => {
  const normalized = term.toLowerCase().trim();
  
  // Common name variations and corrections
  const nameCorrections: { [key: string]: string[] } = {
    'mia khelifa': ['mia khalifa'],
    'mia khalifa': ['mia khalifa'],
    'khalifa': ['mia khalifa'],
    'khelifa': ['mia khalifa'],
    'angelina joly': ['angelina jolie'],
    'angelina jolie': ['angelina jolie'],
    'brad pit': ['brad pitt'],
    'brad pitt': ['brad pitt'],
    'leo dicaprio': ['leonardo dicaprio'],
    'leonardo': ['leonardo dicaprio'],
    'dicaprio': ['leonardo dicaprio'],
    'tom cruse': ['tom cruise'],
    'tom cruise': ['tom cruise'],
    'dwayne jonson': ['dwayne johnson'],
    'dwayne johnson': ['dwayne johnson'],
    'the rock': ['dwayne johnson'],
    'will smith': ['will smith'],
    'wil smith': ['will smith'],
    'scarlet johanson': ['scarlett johansson'],
    'scarlett johansson': ['scarlett johansson'],
    'robert downy jr': ['robert downey jr'],
    'robert downey jr': ['robert downey jr'],
    'rdj': ['robert downey jr'],
    'margot robie': ['margot robbie'],
    'margot robbie': ['margot robbie'],
    'jennifer lawrance': ['jennifer lawrence'],
    'jennifer lawrence': ['jennifer lawrence'],
    'chris evan': ['chris evans'],
    'chris evans': ['chris evans'],
    'chris hemsworth': ['chris hemsworth'],
    'chris pratt': ['chris pratt'],
    'ryan reynolds': ['ryan reynolds'],
    'ryan renolds': ['ryan reynolds'],
    'gal gadot': ['gal gadot'],
    'wonder woman': ['gal gadot'],
    'superman': ['henry cavill'],
    'henry cavil': ['henry cavill'],
    'henry cavill': ['henry cavill'],
    'batman': ['christian bale', 'ben affleck', 'robert pattinson'],
    'christian bale': ['christian bale'],
    'ben afleck': ['ben affleck'],
    'ben affleck': ['ben affleck'],
    'robert patinson': ['robert pattinson'],
    'robert pattinson': ['robert pattinson'],
    'keanu reaves': ['keanu reeves'],
    'keanu reeves': ['keanu reeves'],
    'john wick': ['keanu reeves'],
    'matrix': ['keanu reeves'],
    'hugh jackman': ['hugh jackman'],
    'wolverine': ['hugh jackman'],
    'samuel jackson': ['samuel l jackson'],
    'samuel l jackson': ['samuel l jackson'],
    'nick fury': ['samuel l jackson'],
    'morgan freeman': ['morgan freeman'],
    'denzel washington': ['denzel washington'],
    'denzel': ['denzel washington'],
    'matt damon': ['matt damon'],
    'mark wahlberg': ['mark wahlberg'],
    'vin diesel': ['vin diesel'],
    'fast furious': ['vin diesel'],
    'paul walker': ['paul walker'],
    'michelle rodriguez': ['michelle rodriguez'],
    'jason statham': ['jason statham'],
    'jason momoa': ['jason momoa'],
    'aquaman': ['jason momoa'],
    'zendaya': ['zendaya'],
    'spider man': ['tom holland', 'tobey maguire', 'andrew garfield'],
    'tom holland': ['tom holland'],
    'tobey maguire': ['tobey maguire'],
    'andrew garfield': ['andrew garfield'],
    'emma stone': ['emma stone'],
    'emma watson': ['emma watson'],
    'hermione': ['emma watson'],
    'daniel radcliffe': ['daniel radcliffe'],
    'harry potter': ['daniel radcliffe'],
    'rupert grint': ['rupert grint'],
    'ron weasley': ['rupert grint']
  };

  // Try to find corrections
  const corrections = nameCorrections[normalized];
  if (corrections) {
    return [normalized, ...corrections];
  }

  // Generate variations for typos and common mistakes
  const variations = [normalized];
  
  // Add variations with different spacing
  if (normalized.includes(' ')) {
    variations.push(normalized.replace(/\s+/g, ''));
  }
  
  // Add variations with common letter substitutions
  const commonSubstitutions = [
    { from: 'ph', to: 'f' },
    { from: 'f', to: 'ph' },
    { from: 'c', to: 'k' },
    { from: 'k', to: 'c' },
    { from: 'ie', to: 'y' },
    { from: 'y', to: 'ie' },
    { from: 'tion', to: 'sion' },
    { from: 'sion', to: 'tion' }
  ];
  
  commonSubstitutions.forEach(({ from, to }) => {
    if (normalized.includes(from)) {
      variations.push(normalized.replace(new RegExp(from, 'g'), to));
    }
  });

  return [...new Set(variations)]; // Remove duplicates
};

// Function to search people from TMDB with improved matching
export const searchPeople = async (
  query: string, 
  options: PersonSearchOptions = {}
): Promise<Person[]> => {
  try {
    const token = process.env.NEXT_PUBLIC_TMDB_API_READ_ACCESS_TOKEN;
    const { contentFilter = 'all', includeAdult = true } = options; // Default to 'all' for people search
    const filterConfig = getFilterConfig(contentFilter);
    
    // Get search variations
    const searchTerms = normalizeSearchTerm(query);
    
    let allResults: any[] = [];
    
    // Search with all variations
    for (const searchTerm of searchTerms) {
      try {
        const response = await fetch(
          `https://api.themoviedb.org/3/search/person?query=${encodeURIComponent(searchTerm)}&include_adult=${includeAdult || filterConfig.includeAdult}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          allResults = [...allResults, ...(data?.results || [])];
        }
      } catch (error) {
      }
    }

    if (allResults.length === 0) {
      return [];
    }

    // Remove duplicates based on ID
    const uniqueResults = Array.from(
      new Map(allResults.map(person => [person.id, person])).values()
    );

    // Filter out blocked persons first
    const blockedPersons = await getGloballyBlockedPersons();
    const nonBlockedResults = uniqueResults.filter((person: any) => !blockedPersons.has(person.id));

    // Filter based on content settings (only if contentFilter is not 'all')
    let filteredResults = nonBlockedResults;
    
    if (contentFilter !== 'all') {
      filteredResults = uniqueResults.filter((person: any) => {
        // If content filter is strict, filter out adult content people
        if (contentFilter === 'filtered' && person.adult === true) {
          return false;
        }
        
        // Filter out people whose known_for contains only adult content
        if (contentFilter === 'filtered' && person.known_for) {
          const hasNonAdultWork = person.known_for.some((work: any) => 
            !isAdultContent(work) && work.vote_average > 0
          );
          return hasNonAdultWork;
        }
        
        return true;
      });
    }
    
    // Sort by popularity and relevance
    filteredResults.sort((a: any, b: any) => {
      // Prioritize exact name matches
      const aNameMatch = a.name.toLowerCase() === query.toLowerCase();
      const bNameMatch = b.name.toLowerCase() === query.toLowerCase();
      
      if (aNameMatch && !bNameMatch) return -1;
      if (!aNameMatch && bNameMatch) return 1;
      
      // Then sort by popularity
      return (b.popularity || 0) - (a.popularity || 0);
    });
    
    return filteredResults
      .slice(0, 12) // Show more people - up to 12 results
      .map((person: Record<string, unknown>) => ({
        ...person,
        known_for: (person.known_for as any[])?.filter((item: any) => {
          // Filter known_for works based on content filter
          if (contentFilter === 'filtered') {
            return !isAdultContent(item) && item.vote_average > 0;
          }
          return true;
        }).map(item => ({
          ...item,
          media_type: item.media_type || 'movie'
        })) || []
      })) as Person[];
  } catch (error) {
    return [];
  }
};

// Function to get person details by ID
export const getPersonDetails = async (personId: number): Promise<Person | null> => {
  try {
    // Check if the person is blocked first
    const blockedPersons = await getGloballyBlockedPersons();
    if (blockedPersons.has(personId)) {
      return null; // Don't return details for blocked persons
    }

    const token = process.env.NEXT_PUBLIC_TMDB_API_READ_ACCESS_TOKEN;
    
    const response = await fetch(
      `https://api.themoviedb.org/3/person/${personId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const person = await response.json();
    return person;
  } catch (error) {
    return null;
  }
};
