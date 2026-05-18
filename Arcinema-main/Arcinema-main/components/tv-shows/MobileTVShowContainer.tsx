"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  Tv, 
  TrendingUp, 
  Calendar, 
  Award, 
  Star,
  Play
} from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { projectFirestore } from "@/firebase/config";

const sections = [
  { 
    id: "popular", 
    label: "Popular", 
    icon: TrendingUp,
    description: "Most watched"
  },
  { 
    id: "airing_today", 
    label: "Airing Today", 
    icon: Tv,
    description: "On air now"
  },
  { 
    id: "on_the_air", 
    label: "On The Air", 
    icon: Calendar,
    description: "Currently airing"
  },
  { 
    id: "top_rated", 
    label: "Top Rated", 
    icon: Award,
    description: "Highest rated"
  },
];

interface TVShow {
  id: number;
  name: string;
  poster_path: string;
  backdrop_path: string;
  vote_average: number;
  overview: string;
  first_air_date: string;
}

export default function MobileTVShowContainer() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState(sections[0]);
  const [tvShows, setTVShows] = useState<TVShow[]>([]);
  const [newReleaseTVShows, setNewReleaseTVShows] = useState<TVShow[]>([]);
  const [featuredShow, setFeaturedShow] = useState<TVShow | null>(null);
  const [loading, setLoading] = useState(true);
  const [tvShowsLoading, setTVShowsLoading] = useState(false);
  const [page, setPage] = useState(1);

  // Fetch new release TV shows from notifications
  useEffect(() => {
    if (!user?.uid) {
      setNewReleaseTVShows([]);
      return;
    }

    const fetchNewReleases = async () => {
      try {
        const notificationsRef = collection(projectFirestore, 'notifications');
        const q = query(
          notificationsRef,
          where('userId', '==', user.uid),
          where('type', '==', 'new_tv_release'),
          where('isRead', '==', false),
          orderBy('createdAt', 'desc'),
          limit(3)
        );

        const querySnapshot = await getDocs(q);
        const tvShowIds = querySnapshot.docs
          .map(doc => doc.data().tvShowData?.id)
          .filter(Boolean);

        if (tvShowIds.length > 0) {
          const tvShowsPromises = tvShowIds.map(async (id) => {
            const response = await fetch(
              `https://api.themoviedb.org/3/tv/${id}?language=en-US`,
              {
                headers: {
                  Authorization: `Bearer ${process.env.NEXT_PUBLIC_TMDB_API_READ_ACCESS_TOKEN}`,
                },
              }
            );
            return response.json();
          });

          const tvShowsData = await Promise.all(tvShowsPromises);
          setNewReleaseTVShows(tvShowsData.filter(Boolean));
        }
      } catch (error) {
      }
    };

    fetchNewReleases();
  }, [user?.uid]);

  // Fetch featured TV show (first show from popular)
  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const response = await fetch(
          `https://api.themoviedb.org/3/tv/popular?language=en-US&page=1`,
          {
            headers: {
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_TMDB_API_READ_ACCESS_TOKEN}`,
            },
          }
        );
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          setFeaturedShow(data.results[0]);
        }
      } catch (error) {
      }
    };

    fetchFeatured();
  }, []);

  useEffect(() => {
    const fetchTVShows = async () => {
      setTVShowsLoading(true);
      try {
        const response = await fetch(
          `https://api.themoviedb.org/3/tv/${activeSection.id}?language=en-US&page=${page}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_TMDB_API_READ_ACCESS_TOKEN}`,
            },
          }
        );
        const data = await response.json();
        
        if (page === 1) {
          setTVShows(data.results);
        } else {
          setTVShows(prev => [...prev, ...data.results]);
        }
        setTVShowsLoading(false);
        setLoading(false);
      } catch (error) {
        setTVShowsLoading(false);
        setLoading(false);
      }
    };

    fetchTVShows();
  }, [activeSection.id, page]);

  const handleSectionChange = (section: typeof sections[0]) => {
    setActiveSection(section);
    setPage(1);
    setTVShows([]);
  };

  const handleLoadMore = () => {
    setPage(prev => prev + 1);
  };

  const getTitle = (show: TVShow) => show.name || 'Untitled';
  const getYear = (date: string) => date ? new Date(date).getFullYear() : '';

  if (loading && page === 1) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black pb-20 relative overflow-hidden">
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 opacity-[0.02] grid-pattern" />
        
        {/* Minimal elegant loading */}
        <div className="relative z-10 text-center space-y-8 px-4">
          {/* Simple ring spinner */}
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 rounded-full border-[1px] border-white/5" />
            <div className="absolute inset-0 rounded-full border-[1px] border-transparent border-t-white/40 animate-spin-slow" />
          </div>
          
          {/* Logo name only */}
          <h1 className="text-3xl font-extralight text-white/90 tracking-[0.3em] uppercase">
            Arcinema
          </h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-24">
      {/* Featured TV Show Hero Section - Full Screen */}
      {featuredShow && (
        <div className="relative h-[85vh]">
          {/* Background Image */}
          <Image
            src={`https://image.tmdb.org/t/p/original${featuredShow.backdrop_path || featuredShow.poster_path}`}
            alt={getTitle(featuredShow)}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent" />

          {/* Content */}
          <div className="absolute inset-0 flex flex-col justify-end p-4 px-4">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  <span className="text-lg font-semibold">{featuredShow.vote_average.toFixed(1)}</span>
                </div>
                <span className="text-gray-400">•</span>
                <span className="text-gray-300">{getYear(featuredShow.first_air_date)}</span>
              </div>
              
              <h1 className="text-4xl font-black mb-3 leading-tight">
                {getTitle(featuredShow)}
              </h1>
              
              <p className="text-sm text-gray-300 line-clamp-3 mb-6 leading-relaxed">
                {featuredShow.overview}
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => router.push(`/tv-shows/${featuredShow.id}`)}
                  className="flex-1 bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:via-indigo-400 hover:to-indigo-500 text-white px-6 py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg shadow-indigo-500/30"
                >
                  <Play className="w-5 h-5 fill-white" />
                  Watch Trailer
                </button>
                <button
                  onClick={() => router.push(`/tv-shows/${featuredShow.id}`)}
                  className="px-6 py-3.5 rounded-xl font-semibold bg-white/20 backdrop-blur-md border border-white/20 active:scale-95 transition-transform"
                >
                  Info
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      )}
      
      {/* Category Tabs - Horizontal Scroll */}
      <div className="sticky top-0 z-40 bg-black/95 backdrop-blur-xl border-b border-white/10">
        <div className="px-4 py-4">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection.id === section.id;
              
              return (
                <button
                  key={section.id}
                  onClick={() => handleSectionChange(section)}
                  className={`
                    flex-shrink-0 px-5 py-2.5 rounded-full transition-all duration-200 flex items-center gap-2 whitespace-nowrap
                    ${isActive 
                      ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 text-white font-semibold shadow-lg shadow-indigo-500/30' 
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">{section.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* TV Shows Grid - 3 Columns */}
      <div className="px-4 pt-6">
        {/* New Releases Section */}
        {newReleaseTVShows.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-base font-semibold text-gray-400">New Releases</h2>
              <div className="flex-1 h-px bg-gradient-to-r from-indigo-500/50 to-transparent"></div>
            </div>
            
            <div className="grid grid-cols-3 gap-3 mb-6">
              {newReleaseTVShows.map((show, index) => (
                <motion.div
                  key={show.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  onClick={() => router.push('/notifications')}
                  className="cursor-pointer active:scale-95 transition-transform relative"
                >
                  {/* Badge Number */}
                  <div className="absolute -top-1.5 -left-1.5 z-10 bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 text-white rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs shadow-lg border-2 border-white">
                    {index + 1}
                  </div>
                  
                  {/* Poster */}
                  <div className="relative aspect-[2/3] rounded-xl overflow-hidden mb-2 shadow-lg ring-2 ring-indigo-500/50">
                    <Image
                      src={`https://image.tmdb.org/t/p/w342${show.poster_path}`}
                      alt={getTitle(show)}
                      fill
                      className="object-cover"
                    />
                    
                    {/* Rating Badge */}
                    <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs text-white font-semibold">
                        {show.vote_average.toFixed(1)}
                      </span>
                    </div>
                  </div>
                  
                  {/* Title */}
                  <p className="text-white text-xs font-medium line-clamp-2 leading-tight">
                    {getTitle(show)}
                  </p>
                  <p className="text-gray-400 text-[10px] mt-0.5">
                    {getYear(show.first_air_date)}
                  </p>
                </motion.div>
              ))}
            </div>
            
            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent mb-6"></div>
          </div>
        )}
        
        <div className="grid grid-cols-3 gap-3">
          {tvShows.map((show, index) => (
            <motion.div
              key={show.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.02 }}
              onClick={() => router.push(`/tv-shows/${show.id}`)}
              className="cursor-pointer active:scale-95 transition-transform"
            >
              {/* Poster */}
              <div className="relative aspect-[2/3] rounded-xl overflow-hidden mb-2 shadow-lg">
                <Image
                  src={`https://image.tmdb.org/t/p/w342${show.poster_path}`}
                  alt={getTitle(show)}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity" />
              </div>

              {/* Title - Optional, can remove for cleaner look */}
              <h3 className="text-xs font-medium line-clamp-2 text-gray-300">
                {getTitle(show)}
              </h3>
            </motion.div>
          ))}
        </div>

        {/* Load More Button */}
        <div className="mt-8 mb-4">
          <button
            onClick={handleLoadMore}
            disabled={tvShowsLoading}
            className="w-full px-12 py-3.5 bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:via-indigo-400 hover:to-indigo-500 text-white text-base font-semibold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
          >
            {tvShowsLoading && page > 1 ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                Loading...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Load More TV Shows
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
