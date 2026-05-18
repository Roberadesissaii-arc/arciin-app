// hooks/useTrailer.ts
import { useState } from 'react';
import { getMovieVideos, getTVVideos } from '@/lib/api';

interface TrailerHook {
  isLoading: boolean;
  isModalOpen: boolean;
  trailerUrl: string | null;
  movieTitle: string;
  fetchTrailer: (id: number, title: string, mediaType: 'movie' | 'tv') => Promise<void>;
  openModal: () => void;
  closeModal: () => void;
}

export const useTrailer = (): TrailerHook => {
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [trailerUrl, setTrailerUrl] = useState<string | null>(null);
  const [movieTitle, setMovieTitle] = useState('');

  const fetchTrailer = async (id: number, title: string, mediaType: 'movie' | 'tv') => {
    setIsLoading(true);
    setMovieTitle(title);
    
    try {
      let videosData;
      
      if (mediaType === 'movie') {
        videosData = await getMovieVideos(id);
      } else {
        videosData = await getTVVideos(id);
      }
      
      const videos = videosData.results || [];
      
      // Find the best trailer - prioritize official trailers, then teasers
      const trailer = videos.find((video: any) => 
        video.site === 'YouTube' && 
        (video.type === 'Trailer' || video.type === 'Teaser') &&
        video.official === true
      ) || videos.find((video: any) => 
        video.site === 'YouTube' && 
        (video.type === 'Trailer' || video.type === 'Teaser')
      ) || videos.find((video: any) => 
        video.site === 'YouTube'
      );
      
      if (trailer) {
        setTrailerUrl(`https://www.youtube.com/watch?v=${trailer.key}`);
        setIsModalOpen(true);
      } else {
        // No trailer found, show error or fallback
        // Could show a toast notification here
      }
    } catch (error) {
      // Could show a toast notification here
    } finally {
      setIsLoading(false);
    }
  };

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => {
    setIsModalOpen(false);
    setTrailerUrl(null);
  };

  return {
    isLoading,
    isModalOpen,
    trailerUrl,
    movieTitle,
    fetchTrailer,
    openModal,
    closeModal,
  };
};
