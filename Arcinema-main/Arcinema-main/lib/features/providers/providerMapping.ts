// Provider mapping for streaming service logos
// Maps TMDB production companies and networks to local provider logos

export interface Provider {
  id: string;
  name: string;
  logo: string;
  tmdbNetworkIds?: number[]; // TV show networks
  tmdbCompanyIds?: number[]; // Movie production companies
  tmdbWatchProviderId?: number; // TMDB Watch Provider ID for filtering
  keywords?: string[]; // Alternative matching keywords
}

// Available streaming provider logos
export const PROVIDERS: Provider[] = [
  {
    id: 'netflix',
    name: 'Netflix',
    logo: '/provider/netflix.png',
    tmdbNetworkIds: [213], // Netflix network ID in TMDB
    tmdbCompanyIds: [4640], // Netflix production company ID
    tmdbWatchProviderId: 8, // Netflix watch provider ID
    keywords: ['netflix']
  },
  {
    id: 'disney',
    name: 'Disney+',
    logo: '/provider/disney.png',
    tmdbNetworkIds: [2739], // Disney+ network ID
    tmdbCompanyIds: [2, 3166, 6125], // Walt Disney Pictures, Walt Disney Animation Studios, Disney+
    tmdbWatchProviderId: 337, // Disney+ watch provider ID
    keywords: ['disney', 'disney+', 'walt disney']
  },
  {
    id: 'apple-tv',
    name: 'Apple TV+',
    logo: '/provider/apple-tv-plus-logo.png',
    tmdbNetworkIds: [2552], // Apple TV+ network ID
    tmdbCompanyIds: [420], // Apple TV+ production company
    tmdbWatchProviderId: 350, // Apple TV+ watch provider ID
    keywords: ['apple tv', 'apple tv+', 'apple']
  },
  {
    id: 'hbomax',
    name: 'HBO Max',
    logo: '/provider/hbomax.png',
    tmdbNetworkIds: [49, 3186], // HBO, HBO Max
    tmdbCompanyIds: [7, 3268], // HBO, HBO Max production
    tmdbWatchProviderId: 384, // HBO Max watch provider ID
    keywords: ['hbo', 'hbo max', 'max']
  },
  {
    id: 'hulu',
    name: 'Hulu',
    logo: '/provider/hulu.png',
    tmdbNetworkIds: [453], // Hulu network ID
    tmdbCompanyIds: [4444], // Hulu production company
    tmdbWatchProviderId: 15, // Hulu watch provider ID
    keywords: ['hulu']
  },
  {
    id: 'prime-video',
    name: 'Prime Video',
    logo: '/provider/prime video.png',
    tmdbNetworkIds: [1024], // Prime Video network ID
    tmdbCompanyIds: [5, 508], // Amazon Studios, Amazon Prime Video
    tmdbWatchProviderId: 9, // Prime Video watch provider ID
    keywords: ['amazon', 'prime video', 'amazon prime']
  },
  {
    id: 'paramount',
    name: 'Paramount+',
    logo: '/provider/Paramount-Logo.png',
    tmdbNetworkIds: [4330], // Paramount+ network ID
    tmdbCompanyIds: [4, 1709], // Paramount Pictures, Paramount+
    tmdbWatchProviderId: 531, // Paramount+ watch provider ID
    keywords: ['paramount', 'paramount+', 'paramount plus']
  },
  {
    id: 'peacock',
    name: 'Peacock',
    logo: '/provider/peacock.png',
    tmdbNetworkIds: [3353], // Peacock network ID
    tmdbCompanyIds: [2739], // NBCUniversal/Peacock
    tmdbWatchProviderId: 387, // Peacock watch provider ID
    keywords: ['peacock', 'nbc', 'nbcuniversal']
  },
  {
    id: 'showtime',
    name: 'Showtime',
    logo: '/provider/showtime-2-logo-png-transparent.png',
    tmdbNetworkIds: [67], // Showtime network ID
    tmdbCompanyIds: [213], // Showtime production company
    tmdbWatchProviderId: 37, // Showtime watch provider ID
    keywords: ['showtime', 'sho']
  },
  {
    id: 'youtube',
    name: 'YouTube',
    logo: '/provider/YouTube-Logo.png',
    tmdbNetworkIds: [247], // YouTube network ID
    tmdbCompanyIds: [1957], // YouTube Originals
    tmdbWatchProviderId: 192, // YouTube watch provider ID
    keywords: ['youtube', 'youtube originals', 'youtube premium']
  },
  {
    id: 'fubo',
    name: 'FuboTV',
    logo: '/provider/fubotv-logo-freelogovectors.net_.png',
    tmdbNetworkIds: [], // FuboTV is more of a live TV service
    tmdbCompanyIds: [],
    tmdbWatchProviderId: 257, // FuboTV watch provider ID
    keywords: ['fubo', 'fubotv', 'fubo tv']
  },
  {
    id: 'aha',
    name: 'Aha',
    logo: '/provider/aha_logo.png',
    tmdbNetworkIds: [], // Aha is an Indian streaming service, TMDB ID needs research
    tmdbCompanyIds: [],
    keywords: ['aha', 'aha video', 'telugu', 'tamil']
  }
];

// Get provider for a TV show based on networks
export const getTVShowProvider = (networks?: { id: number; name: string }[]): Provider | null => {
  if (!networks || networks.length === 0) return null;

  for (const network of networks) {
    // First try exact network ID matching
    const provider = PROVIDERS.find(p => 
      p.tmdbNetworkIds?.includes(network.id)
    );
    
    if (provider) return provider;

    // Fallback to keyword matching
    const keywordProvider = PROVIDERS.find(p => 
      p.keywords?.some(keyword => 
        network.name.toLowerCase().includes(keyword.toLowerCase())
      )
    );
    
    if (keywordProvider) return keywordProvider;
  }

  return null;
};

// Get provider for a movie based on production companies
export const getMovieProvider = (companies?: { id: number; name: string }[]): Provider | null => {
  if (!companies || companies.length === 0) return null;

  for (const company of companies) {
    // First try exact company ID matching
    const provider = PROVIDERS.find(p => 
      p.tmdbCompanyIds?.includes(company.id)
    );
    
    if (provider) return provider;

    // Fallback to keyword matching
    const keywordProvider = PROVIDERS.find(p => 
      p.keywords?.some(keyword => 
        company.name.toLowerCase().includes(keyword.toLowerCase())
      )
    );
    
    if (keywordProvider) return keywordProvider;
  }

  return null;
};

// Get provider based on media type and data
export const getMediaProvider = (
  mediaType: 'movie' | 'tv',
  data: {
    networks?: { id: number; name: string }[];
    production_companies?: { id: number; name: string }[];
  }
): Provider | null => {
  if (mediaType === 'tv') {
    return getTVShowProvider(data.networks);
  } else {
    return getMovieProvider(data.production_companies);
  }
};

// Provider badge component props
export interface ProviderBadgeProps {
  provider: Provider;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}