// components/ui/WatchProviderBadge.tsx
"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { getPrimaryStreamingProvider, mapProviderToLocal, getWatchProviders } from '@/lib/features/providers/watchProvidersApi';

// Extended provider detection function
async function detectAdditionalProviders(mediaId: number, mediaType: 'movie' | 'tv'): Promise<string | null> {
  try {
    // Get all available regions and check for providers
    const regionsToCheck = ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'JP'];
    
    for (const region of regionsToCheck) {
      const providers = await getWatchProviders(mediaId, mediaType, region);
      
      for (const provider of providers) {
        const localLogo = mapProviderToLocal(provider);
        if (localLogo) {
          return localLogo;
        }
      }
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

interface WatchProviderBadgeProps {
  mediaId: number;
  mediaType: 'movie' | 'tv';
  region?: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export default function WatchProviderBadge({ 
  mediaId, 
  mediaType, 
  region = 'US', 
  size = 'small',
  className = '' 
}: WatchProviderBadgeProps) {
  const [providerLogo, setProviderLogo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInTheaters, setIsInTheaters] = useState(false);

  useEffect(() => {
    const fetchProvider = async () => {
      try {
        setIsLoading(true);
        
        // First, try to get primary streaming provider for the specified region
        const provider = await getPrimaryStreamingProvider(mediaId, mediaType, region);
        
        if (provider) {
          const localLogo = mapProviderToLocal(provider);
          setProviderLogo(localLogo);
          setIsInTheaters(false);
        } else {
          // Try to find providers in other regions
          const additionalProvider = await detectAdditionalProviders(mediaId, mediaType);
          
          if (additionalProvider) {
            setProviderLogo(additionalProvider);
            setIsInTheaters(false);
          } else {
            // No streaming provider found anywhere, check if it's a recent movie in theaters
            if (mediaType === 'movie' && region === 'US') {
              // Check if it's a recent movie that might be in theaters
              const movieResponse = await fetch(`https://api.themoviedb.org/3/movie/${mediaId}?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}`);
              if (movieResponse.ok) {
                const movieData = await movieResponse.json();
                const releaseDate = new Date(movieData.release_date);
                const now = new Date();
                const currentYear = now.getFullYear();
                const movieYear = releaseDate.getFullYear();
                
              // Check if movie is from current year or within last 6 months
              const sixMonthsAgo = new Date(now.getTime() - (6 * 30 * 24 * 60 * 60 * 1000));
              const oneYearForward = new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000)); // Future releases
              const isRecentOrUpcoming = releaseDate >= sixMonthsAgo && releaseDate <= oneYearForward;
              const isCurrentYear = movieYear === currentYear;
              const isNextYear = movieYear === currentYear + 1;
              
                // If it's a recent/current/upcoming year movie, show theater logo
                if (isRecentOrUpcoming || isCurrentYear || isNextYear) {
                  // Randomly choose between theater chains
                  const theaterLogos = ['AMC_Theater.png', 'cinemarkLogoRt.webp'];
                  const randomTheater = theaterLogos[Math.floor(Math.random() * theaterLogos.length)];
                  setProviderLogo(randomTheater);
                  setIsInTheaters(true);
                } else {
                  setProviderLogo(null);
                  setIsInTheaters(false);
                }
              } else {
                setProviderLogo(null);
                setIsInTheaters(false);
              }
            } else {
              // Fallback for TV shows when no streaming provider found
              if (mediaType === 'tv') {
                // For TV shows without streaming providers, show "TV" text badge
                setProviderLogo('TV_FALLBACK');
                setIsInTheaters(false);
              } else {
                setProviderLogo(null);
                setIsInTheaters(false);
              }
            }
          }
        }
      } catch (error) {
        setProviderLogo(null);
        setIsInTheaters(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProvider();
  }, [mediaId, mediaType, region]);

  // Don't render anything if no provider or still loading
  if (isLoading || !providerLogo) {
    return null;
  }

  // Size configurations - just the image, much bigger sizes
  const sizeConfig = {
    small: {
      width: 44,
      height: 44
    },
    medium: {
      width: 56, 
      height: 56
    },
    large: {
      width: 64,
      height: 64
    }
  };

  const config = sizeConfig[size];

  // Handle TV fallback with text badge
  if (providerLogo === 'TV_FALLBACK') {
    const sizeClasses = {
      small: 'text-xs px-2 py-px',
      medium: 'text-sm px-3 py-px', 
      large: 'text-base px-4 py-0.5'
    };
    
    return (
      <span 
        className={`${sizeClasses[size]} bg-white/10 backdrop-blur-md text-white/90 font-medium rounded-md border border-white/20 hover:scale-105 transition-transform duration-300 ${className}`}
      >
        TV
      </span>
    );
  }

  return (
    <Image
      src={`/provider/${providerLogo}`}
      alt={isInTheaters ? "In Theaters" : "Streaming Provider"}
      width={config.width}
      height={config.height}
      className={`object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-300 ${className}`}
      onError={() => setProviderLogo(null)}
    />
  );
}