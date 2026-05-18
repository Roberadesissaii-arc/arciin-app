// lib/genreFonts.ts
// Genre to Font Mapping System

export interface GenreFontMapping {
  genreIds: number[];
  genreNames: string[];
  fontClass: string;
  category: string;
}

export const GENRE_FONT_MAP: GenreFontMapping[] = [
  // Horror / Dark (2 options - will alternate)
  {
    genreIds: [27], // Horror
    genreNames: ['horror', 'zombie'],
    fontClass: 'font-butcherman',
    category: 'Horror / Zombie'
  },
  {
    genreIds: [27], // Horror (alternate option)
    genreNames: ['horror', 'monster', 'creature'],
    fontClass: 'font-jolly-lodger',
    category: 'Horror / Monster'
  },
  
  // Thriller (Pirata One)
  {
    genreIds: [53], // Thriller
    genreNames: ['thriller', 'suspense'],
    fontClass: 'font-pirata-one',
    category: 'Thriller / Suspense'
  },
  
  // Fantasy (UnifrakturMaguntia - Gothic/Medieval)
  {
    genreIds: [14], // Fantasy
    genreNames: ['fantasy', 'dark fantasy', 'gothic', 'medieval'],
    fontClass: 'font-unifraktur-maguntia',
    category: 'Fantasy / Gothic'
  },
  
  // War / Epic (Grenze Gotisch)
  {
    genreIds: [10752], // War
    genreNames: ['war', 'epic war', 'historical war'],
    fontClass: 'font-grenze',
    category: 'Epic / War'
  },
  
  // Action (Bebas Neue - Bold and impactful)
  {
    genreIds: [28], // Action
    genreNames: ['action', 'explosive'],
    fontClass: 'font-bebas-neue',
    category: 'Action / Explosive'
  },
  
  // Mystery / Occult
  {
    genreIds: [9648], // Mystery
    genreNames: ['mystery', 'occult'],
    fontClass: 'font-unifraktur-cook',
    category: 'Mystery / Occult'
  },
  
  // Crime / Gritty Drama
  {
    genreIds: [80], // Crime
    genreNames: ['crime', 'gritty'],
    fontClass: 'font-rubik-burned',
    category: 'Gritty Drama'
  },
  
  // Adventure / Epic Fantasy (Cinzel Decorative)
  {
    genreIds: [12], // Adventure
    genreNames: ['adventure', 'quest', 'epic'],
    fontClass: 'font-cinzel-decorative',
    category: 'Epic Adventure'
  },
  
  // History / Biography (Bodoni Moda)
  {
    genreIds: [36], // History
    genreNames: ['history', 'historical', 'period', 'biography'],
    fontClass: 'font-bodoni-moda',
    category: 'Historical / Biography'
  },
  
  // Romance (2 options)
  {
    genreIds: [10749], // Romance
    genreNames: ['romance', 'love story'],
    fontClass: 'font-playwrite-vn',
    category: 'Romance / Love Story'
  },
  {
    genreIds: [10749], // Romance (alternate option)
    genreNames: ['romance', 'love', 'romantic'],
    fontClass: 'font-eagle-lake',
    category: 'Romance / Classic'
  },
  
  // Drama (Indie)
  {
    genreIds: [18], // Drama
    genreNames: ['indie', 'arthouse', 'independent'],
    fontClass: 'font-caveat-brush',
    category: 'Indie Film / Arthouse'
  },
  
  // Comedy
  {
    genreIds: [35, 18], // Comedy, Drama
    genreNames: ['comedic drama', 'dramedy', 'comedy'],
    fontClass: 'font-patrick-hand',
    category: 'Comedy'
  },
  
  // Documentary
  {
    genreIds: [99], // Documentary
    genreNames: ['documentary', 'personal'],
    fontClass: 'font-shadows-into-light',
    category: 'Documentary / Personal'
  },
  
  // Family
  {
    genreIds: [10751], // Family
    genreNames: ['family', 'quirky'],
    fontClass: 'font-pangolin',
    category: 'Quirky / Family'
  },
  
  // Sci-Fi / Space Opera
  {
    genreIds: [878], // Science Fiction
    genreNames: ['science fiction', 'space opera', 'sci-fi', 'space'],
    fontClass: 'font-alan-sans',
    category: 'Space Opera'
  },
  
  // Tech / Futuristic
  {
    genreIds: [878, 53], // Sci-Fi Thriller
    genreNames: ['tech thriller', 'cyberpunk', 'futuristic'],
    fontClass: 'font-ibm-plex',
    category: 'Tech / Futuristic'
  },
  
  // Animation
  {
    genreIds: [16], // Animation
    genreNames: ['animation', 'animated'],
    fontClass: 'font-pangolin',
    category: 'Animation'
  },
];

export function getGenreFont(genres: Array<{ id: number; name: string }> | Array<{ mal_id: number; name: string }>, mediaId?: number): string {
  if (!genres || genres.length === 0) {
    return 'font-cinzel-decorative'; // Default elegant font
  }

  // Handle both TMDB (id) and MAL (mal_id) genre formats
  const genreIds = genres.map(g => ('id' in g ? g.id : g.mal_id));
  const genreNames = genres.map(g => g.name.toLowerCase());

  // Collect all matching fonts (for variety when multiple options exist)
  const matchingFonts: string[] = [];

  // Check for exact genre ID matches first
  for (const mapping of GENRE_FONT_MAP) {
    if (mapping.genreIds.some(id => genreIds.includes(id))) {
      // If genre names are specified, check for name match too
      if (mapping.genreNames.length > 0) {
        if (mapping.genreNames.some(name => 
          genreNames.some(gn => gn.includes(name))
        )) {
          matchingFonts.push(mapping.fontClass);
        }
      } else {
        matchingFonts.push(mapping.fontClass);
      }
    }
  }

  // If we have matching fonts from ID check, use them
  if (matchingFonts.length > 0) {
    // Use media ID to deterministically pick a font (provides variety)
    if (mediaId && matchingFonts.length > 1) {
      const index = mediaId % matchingFonts.length;
      return matchingFonts[index];
    }
    return matchingFonts[0];
  }

  // Check for keyword matches in genre names
  for (const mapping of GENRE_FONT_MAP) {
    if (mapping.genreNames.some(keyword => 
      genreNames.some(gn => gn.includes(keyword))
    )) {
      matchingFonts.push(mapping.fontClass);
    }
  }

  if (matchingFonts.length > 0) {
    if (mediaId && matchingFonts.length > 1) {
      const index = mediaId % matchingFonts.length;
      return matchingFonts[index];
    }
    return matchingFonts[0];
  }

  // Default to elegant serif for unknown genres
  return 'font-cinzel-decorative';
}

export function getGenreCategory(genres: Array<{ id: number; name: string }>): string {
  if (!genres || genres.length === 0) {
    return 'Epic Fantasy';
  }

  const genreIds = genres.map(g => g.id);
  const genreNames = genres.map(g => g.name.toLowerCase());

  for (const mapping of GENRE_FONT_MAP) {
    if (mapping.genreIds.some(id => genreIds.includes(id))) {
      if (mapping.genreNames.length > 0) {
        if (mapping.genreNames.some(name => 
          genreNames.some(gn => gn.includes(name))
        )) {
          return mapping.category;
        }
      } else {
        return mapping.category;
      }
    }
  }

  return 'Drama';
}
