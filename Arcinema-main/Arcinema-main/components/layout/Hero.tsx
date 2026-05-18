// components/layout/Hero.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

interface Movie {
  id: number;
  title?: string;
  name?: string;
  backdrop_path: string;
  vote_average: number;
  overview: string;
  release_date?: string;
  first_air_date?: string;
  media_type?: string;
}

export default function Hero() {
  const router = useRouter();
  const [heroMovies, setHeroMovies] = useState<Movie[]>([]);
  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHero = async () => {
      try {
        const response = await fetch(
          'https://api.themoviedb.org/3/trending/movie/day?language=en-US',
          {
            headers: {
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_TMDB_API_READ_ACCESS_TOKEN}`,
            },
          }
        );
        const data = await response.json();
        setHeroMovies(data.results.slice(0, 5));
        setLoading(false);
      } catch (error) {
        setLoading(false);
      }
    };
    fetchHero();
  }, []);

  useEffect(() => {
    if (heroMovies.length === 0) return;
    const interval = setInterval(() => {
      setCurrentHeroIndex((prev) => (prev + 1) % heroMovies.length);
    }, 10000);
    return () => clearInterval(interval);
  }, [heroMovies.length]);

  const currentHero = heroMovies[currentHeroIndex];
  const getTitle = (item: Movie) => item.title || item.name || 'Untitled';

  if (loading || !currentHero) {
    return (
      <div className="relative h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="relative h-screen overflow-hidden bg-black">
      <AnimatePresence initial={false}>
        {currentHero && (
          <motion.div
            key={currentHeroIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            <motion.div
              initial={{ scale: 1 }}
              animate={{ scale: 1.05 }}
              transition={{ duration: 10, ease: "linear" }}
              className="absolute inset-0"
            >
              <Image
                src={`https://image.tmdb.org/t/p/original${currentHero.backdrop_path}`}
                alt={getTitle(currentHero)}
                fill
                className="object-cover"
                priority
              />
            </motion.div>
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />

            <div className="absolute bottom-0 left-0 right-0 px-12 pb-32">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="inline-block px-4 py-1.5 bg-black/50 backdrop-blur-md rounded-full text-xs mb-4 border border-white/20"
              >
                Trending Now
              </motion.div>
              
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-5xl lg:text-6xl font-bold mb-4 max-w-3xl"
              >
                {getTitle(currentHero)}
              </motion.h1>
              
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-lg text-gray-200 mb-4 max-w-2xl line-clamp-2"
              >
                {currentHero.overview}
              </motion.p>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex items-center gap-2 text-sm text-gray-300 mb-6"
              >
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  {currentHero.vote_average.toFixed(1)}
                </span>
                <span>·</span>
                <span>{currentHero.title ? 'Movie' : currentHero.name ? 'TV Show' : 'Movie'}</span>
                <span>·</span>
                <span>{currentHero.release_date ? new Date(currentHero.release_date).getFullYear() : currentHero.first_air_date ? new Date(currentHero.first_air_date).getFullYear() : 'N/A'}</span>
              </motion.div>
            </div>

            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-2">
              {heroMovies.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentHeroIndex(index)}
                  aria-label={`Go to slide ${index + 1}`}
                  className={`h-2 rounded-full transition-all ${
                    index === currentHeroIndex ? 'w-8 bg-white' : 'w-2 bg-white/40'
                  }`}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Static Buttons - Outside AnimatePresence */}
      {currentHero && (
        <div className="absolute bottom-0 left-0 right-0 px-12 pb-32 pointer-events-none">
          <div className="flex items-center gap-4 pointer-events-auto mt-[200px]">
            <button 
              onClick={() => router.push(`/movies/${currentHero.id}`)}
              className="px-12 py-3.5 bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:via-indigo-400 hover:to-indigo-500 text-white text-base font-semibold rounded-lg transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
              Watch Trailer
            </button>
            
            <button 
              onClick={() => router.push('/cineai')}
              className="px-10 py-3.5 bg-transparent border-2 border-white hover:bg-white/10 text-white text-base font-semibold rounded-lg transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 22.5l-.394-1.933a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"/>
              </svg>
              CineAI
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
