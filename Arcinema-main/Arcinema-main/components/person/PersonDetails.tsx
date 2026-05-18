"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Calendar, MapPin, Star, Ban, Shield, User, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/use-toast";
import { 
  blockPersonForAdmin, 
  unblockPersonForAdmin, 
  isPersonBlocked as checkIfPersonBlocked, 
  isAdmin 
} from "@/lib/firebase/userBlockedContent";
import BlockConfirmDialog from "@/components/ui/BlockConfirmDialog";

interface PersonDetails {
  id: number;
  name: string;
  biography: string;
  birthday?: string;
  place_of_birth?: string;
  profile_path?: string;
  known_for_department: string;
}

interface MovieCredit {
  id: number;
  title: string;
  poster_path?: string;
  backdrop_path?: string;
  release_date?: string;
  character: string;
  vote_average: number;
}

interface TVCredit {
  id: number;
  name: string;
  poster_path?: string;
  backdrop_path?: string;
  first_air_date?: string;
  character: string;
  vote_average: number;
}

interface HeroItem {
  id: number;
  title?: string;
  name?: string;
  backdrop_path?: string;
  vote_average: number;
  media_type: string;
}

export default function PersonDetails() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [person, setPerson] = useState<PersonDetails | null>(null);
  const [movieCredits, setMovieCredits] = useState<MovieCredit[]>([]);
  const [tvCredits, setTVCredits] = useState<TVCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPersonBlocked, setIsPersonBlocked] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [isBlockLoading, setIsBlockLoading] = useState(false);
  const [showAllMovies, setShowAllMovies] = useState(false);
  const [showAllTVShows, setShowAllTVShows] = useState(false);
  
  const userIsAdmin = user ? isAdmin(user.email) : false;

  // Prepare hero movies - combine movie and TV credits and get ones with backdrops
  const heroMovies = React.useMemo((): HeroItem[] => {
    // Determine which category has more content
    const hasMoreMovies = movieCredits.length >= tvCredits.length;
    
    // Prioritize the category with more content, then add from the other category
    const primaryCredits: HeroItem[] = hasMoreMovies 
      ? movieCredits.map(movie => ({ 
          id: movie.id,
          title: movie.title,
          backdrop_path: movie.backdrop_path,
          vote_average: movie.vote_average,
          media_type: 'movie' as const
        }))
      : tvCredits.map(tv => ({ 
          id: tv.id,
          name: tv.name,
          backdrop_path: tv.backdrop_path,
          vote_average: tv.vote_average,
          media_type: 'tv' as const
        }));

    const secondaryCredits: HeroItem[] = hasMoreMovies
      ? tvCredits.map(tv => ({ 
          id: tv.id,
          name: tv.name,
          backdrop_path: tv.backdrop_path,
          vote_average: tv.vote_average,
          media_type: 'tv' as const
        }))
      : movieCredits.map(movie => ({ 
          id: movie.id,
          title: movie.title,
          backdrop_path: movie.backdrop_path,
          vote_average: movie.vote_average,
          media_type: 'movie' as const
        }));
    
    // Filter items with good backdrops and high ratings, prioritizing primary category
    const primaryWithBackdrops = primaryCredits
      .filter(item => item.backdrop_path)
      .sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
      
    const secondaryWithBackdrops = secondaryCredits
      .filter(item => item.backdrop_path)
      .sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
    
    // Combine with primary category first, then add secondary to fill up to 6
    const combined = [
      ...primaryWithBackdrops.slice(0, 4), // Take top 4 from primary category
      ...secondaryWithBackdrops.slice(0, 2)  // Add top 2 from secondary category
    ];
    
    return combined.slice(0, 6); // Ensure max 6 items
  }, [movieCredits, tvCredits]);

  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);

  // Auto-rotate hero background every 8 seconds
  useEffect(() => {
    if (heroMovies.length > 1) {
      const interval = setInterval(() => {
        setCurrentHeroIndex((prev) => (prev + 1) % heroMovies.length);
      }, 8000);
      return () => clearInterval(interval);
    }
  }, [heroMovies.length]);

  useEffect(() => {
    const fetchPersonDetails = async () => {
      try {
        setLoading(true);
        const personId = params.id;

        // Use secure server-side endpoint
        const endpoint = userIsAdmin 
          ? `/api/person/${personId}/admin`
          : `/api/person/${personId}`;
        
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };
        
        // Add user email for admin verification
        if (user?.email) {
          headers['x-user-email'] = user.email;
        }

        const response = await fetch(endpoint, { headers });

        if (!response.ok) {
          if (response.status === 404) {
            setError('Person not found');
          } else if (response.status === 403) {
            setError('Access denied');
          } else {
            setError('Failed to load person details');
          }
          return;
        }

        const data = await response.json();
        
        setPerson(data.person);
        setMovieCredits(data.movieCredits || []);
        setTVCredits(data.tvCredits || []);
        setIsPersonBlocked(data.isBlocked || false);

      } catch (err) {
        setError('Failed to load person details');
      } finally {
        setLoading(false);
      }
    };

    if (params.id && user !== undefined) { // Wait for auth to load
      fetchPersonDetails();
    }
  }, [params.id, userIsAdmin, user]);

  const handleBlockConfirm = async () => {
    if (!user || !person || !userIsAdmin) return;
    
    setShowBlockDialog(false);
    setIsBlockLoading(true);
    
    try {
      await blockPersonForAdmin(
        person.id,
        person.name,
        person.profile_path || null,
        user.uid,
        user.email || ''
      );
      
      setIsPersonBlocked(true);
      
      toast({
        title: "🚫 Person Blocked",
        description: `${person.name} has been blocked. All content featuring this person will be hidden from all users.`,
        action: (
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                await unblockPersonForAdmin(
                  person.id,
                  user.uid,
                  user.email || ''
                );
                setIsPersonBlocked(false);
                toast({
                  title: "✅ Person Unblocked",
                  description: `${person.name} has been restored`,
                  className: "bg-black/40 backdrop-blur-xl border-white/20 text-white shadow-2xl"
                });
              } catch (error) {
                toast({
                  title: "Error",
                  description: "Failed to unblock person",
                  variant: "destructive"
                });
              }
            }}
            className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs px-3 shrink-0 backdrop-blur-sm"
          >
            Undo
          </Button>
        ),
        className: "bg-black/40 backdrop-blur-xl border-white/20 text-white shadow-2xl"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to block person",
        variant: "destructive"
      });
    } finally {
      setIsBlockLoading(false);
    }
  };

  const handleUnblockPerson = async () => {
    if (!user || !person || !userIsAdmin) return;
    
    setIsBlockLoading(true);
    
    try {
      await unblockPersonForAdmin(
        person.id,
        user.uid,
        user.email || ''
      );
      
      setIsPersonBlocked(false);
      
      toast({
        title: "✅ Person Unblocked",
        description: `${person.name} has been unblocked and their content is now visible to all users.`,
        className: "bg-black/40 backdrop-blur-xl border-white/20 text-white shadow-2xl"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to unblock person",
        variant: "destructive"
      });
    } finally {
      setIsBlockLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col justify-center items-center overflow-hidden">
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 opacity-[0.02] grid-pattern" />
        
        {/* Minimal elegant loading */}
        <div className="relative z-10 text-center space-y-8 px-4">
          {/* Simple ring spinner */}
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 rounded-full border-[1px] border-white/5" />
            <div className="absolute inset-0 rounded-full border-[1px] border-transparent border-t-white/40 animate-spin-slow" />
          </div>
          
          {/* Loading text */}
          <h1 className="text-3xl text-white/90 tracking-[0.3em] uppercase font-galindo">
            Loading
          </h1>
        </div>
      </div>
    );
  }

  if (error || !person) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center relative z-10 max-w-lg mx-auto px-6"
        >
          {/* Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="mb-8"
          >
            <div className="w-24 h-24 mx-auto bg-gradient-to-br from-gray-700 to-gray-800 rounded-full flex items-center justify-center shadow-2xl border border-gray-600/30">
              <User className="w-12 h-12 text-gray-400" />
            </div>
          </motion.div>

          {/* Title */}
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent"
          >
            No Information Found
          </motion.h1>

          {/* Description */}
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="text-gray-400 text-lg mb-8 leading-relaxed"
          >
            The person you're looking for is currently not available or doesn't exist in our database.
          </motion.p>

          {/* Suggestions */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mb-8 p-6 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10"
          >
            <h3 className="text-white font-semibold mb-3">Try searching for:</h3>
            <ul className="text-gray-300 text-sm space-y-2">
              <li>• Popular actors and actresses</li>
              <li>• Directors and producers</li>
              <li>• Movie and TV show characters</li>
              <li>• Different spelling variations</li>
            </ul>
          </motion.div>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button 
              onClick={() => router.back()} 
              variant="outline"
              className="bg-white/10 hover:bg-white/20 border-white/20 text-white backdrop-blur-sm px-6 py-3 rounded-xl font-medium transition-all duration-200 hover:scale-105"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
            <Button 
              onClick={() => router.push('/search')} 
              className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 hover:from-indigo-500 hover:via-indigo-400 hover:to-indigo-500 text-white font-medium before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent px-6 py-3 rounded-md shadow-lg transition-all duration-200 hover:scale-105"
            >
              <Search className="w-4 h-4 mr-2" />
              Search People
            </Button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section with Person's Movies/TV Shows */}
      {heroMovies.length > 0 && (
        <div className="relative h-[60vh] md:h-[70vh] overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentHeroIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
              className="absolute inset-0"
            >
              <Image
                src={`https://image.tmdb.org/t/p/original${heroMovies[currentHeroIndex]?.backdrop_path}`}
                alt={heroMovies[currentHeroIndex]?.title || heroMovies[currentHeroIndex]?.name || 'Movie'}
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/20" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-black/40" />
            </motion.div>
          </AnimatePresence>

          {/* Hero Content */}
          <div className="relative z-10 h-full flex items-end">
            <div className="max-w-7xl mx-auto w-full px-4 pb-12 md:pb-16">
              <div className="flex flex-col md:flex-row md:items-end gap-6 md:gap-8">
                {/* Profile Image */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="flex-shrink-0"
                >
                  <div className="relative w-32 h-32 md:w-48 md:h-60 lg:w-56 lg:h-72 rounded-2xl overflow-hidden shadow-2xl border-4 border-white/20 backdrop-blur-sm bg-black/20">
                    {person.profile_path ? (
                      <Image
                        src={`https://image.tmdb.org/t/p/w500${person.profile_path}`}
                        alt={person.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                        <User className="w-16 h-16 md:w-20 md:h-20 text-gray-400" />
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Mobile badges */}
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mb-4 flex flex-wrap items-center gap-3 md:hidden"
                  >
                    <span className="inline-block px-3 py-1 bg-white/10 backdrop-blur-md rounded-md text-sm text-white/90 border border-white/20">
                      {person.known_for_department || 'Actor'}
                    </span>
                    <span className="inline-block px-3 py-1 bg-white/10 backdrop-blur-md rounded-md text-sm text-white/90 border border-white/20">
                      {movieCredits.length + tvCredits.length} Credits
                    </span>
                  </motion.div>

                  {/* Desktop badge - only department */}
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mb-4 hidden md:block"
                  >
                    <span className="inline-block px-4 py-2 bg-white/10 backdrop-blur-md rounded-full text-white/90 border border-white/20">
                      {person.known_for_department || 'Actor'}
                    </span>
                  </motion.div>
                  
                  <motion.h1
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-4xl md:text-6xl font-bold text-white mb-4 leading-tight"
                  >
                    {person.name}
                  </motion.h1>
                
                {person.biography && (
                  <motion.p
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-gray-200 text-lg md:text-xl leading-relaxed mb-6 line-clamp-3"
                  >
                    {person.biography}
                  </motion.p>
                )}
                
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="flex flex-wrap items-center gap-4"
                  >
                    <div className="text-sm text-gray-300 hidden md:block">
                      <span className="text-white font-medium">{movieCredits.length + tvCredits.length}</span> Credits
                    </div>
                    {person.birthday && (
                      <div className="text-sm text-gray-300">
                        Born <span className="text-white font-medium">{new Date(person.birthday).toLocaleDateString()}</span>
                      </div>
                    )}

                    {/* Admin Controls in Hero */}
                    {userIsAdmin && (
                      <div className="flex items-center gap-2">
                        {isPersonBlocked ? (
                          <>
                            <Button
                              onClick={handleUnblockPerson}
                              disabled={isBlockLoading}
                              size="sm"
                              className="bg-indigo-600 hover:bg-indigo-700 text-white border-0"
                            >
                              <Shield className="w-4 h-4 mr-1" />
                              {isBlockLoading ? 'Unblocking...' : 'Unblock'}
                            </Button>
                            <div className="px-2 py-1 bg-red-500/20 rounded-lg border border-red-500/30">
                              <span className="text-red-400 text-xs font-medium">Blocked</span>
                            </div>
                          </>
                        ) : (
                          <Button
                            onClick={() => setShowBlockDialog(true)}
                            disabled={isBlockLoading}
                            size="sm"
                            variant="outline"
                            className="bg-red-600/20 hover:bg-red-600/30 border-red-500/50 text-red-400 hover:text-red-300"
                          >
                            <Ban className="w-4 h-4 mr-1" />
                            {isBlockLoading ? 'Blocking...' : 'Block'}
                          </Button>
                        )}
                      </div>
                    )}
                  </motion.div>
                </div>
              </div>
            </div>
          </div>

          {/* Hero Navigation Dots */}
          {heroMovies.length > 1 && (
            <div className="absolute bottom-4 right-4 z-20 flex gap-2">
              {heroMovies.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentHeroIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentHeroIndex
                      ? 'bg-white w-8'
                      : 'bg-white/40 hover:bg-white/60'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mobile Header */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10 md:hidden">
        <div className="flex items-center justify-between px-4 py-3 pt-safe-top">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="text-gray-300 hover:text-white hover:bg-white/10 p-2 rounded-full transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold text-white truncate px-4">
            {person.name}
          </h1>
          <div className="w-9 h-9"> {/* Spacer for symmetry */}
            {userIsAdmin && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowBlockDialog(true)}
                className="text-gray-300 hover:text-white hover:bg-white/10 p-2 rounded-full transition-all"
              >
                {isPersonBlocked ? <Shield className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:block max-w-7xl mx-auto px-4 pt-20 pb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="text-gray-400 hover:text-white mb-6 hover:bg-white/10 transition-all rounded-lg"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      {/* Separator */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mb-8"></div>
      </div>

      {/* Known For Section */}
      <div className="px-4 pb-8 md:hidden">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {(movieCredits.length > 0 || tvCredits.length > 0) ? (
            <>
            
            {/* Movie Credits */}
            {movieCredits.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-3 text-left">Movies</h3>
                <div className="grid grid-cols-3 gap-3">
                  {(showAllMovies ? movieCredits : movieCredits.slice(0, 9)).map((movie, index) => (
                    <motion.div
                      key={`movie-${movie.id}-${index}`}
                      className="group cursor-pointer"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => router.push(`/movies/${movie.id}`)}
                    >
                      <div className="aspect-[2/3] rounded-xl overflow-hidden bg-gray-800 shadow-lg relative">
                        {movie.poster_path ? (
                          <Image
                            src={`https://image.tmdb.org/t/p/w300${movie.poster_path}`}
                            alt={movie.title}
                            width={300}
                            height={450}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800">
                            <User className="w-8 h-8 text-gray-500" />
                          </div>
                        )}
                        
                        {/* Rating Overlay */}
                        <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm rounded-lg px-2 py-1">
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-400" />
                            <span className="text-white text-xs font-medium">{movie.vote_average.toFixed(1)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-2">
                        <h4 className="font-medium text-xs line-clamp-2 text-white leading-tight">
                          {movie.title}
                        </h4>
                        <p className="text-xs text-gray-400 line-clamp-1 mt-1">
                          {movie.release_date ? new Date(movie.release_date).getFullYear() : 'TBA'}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
                
                {movieCredits.length > 9 && (
                  <div className="text-center mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAllMovies(!showAllMovies)}
                      className="bg-white/5 hover:bg-white/10 border-white/20 text-gray-300 hover:text-white text-sm px-4"
                    >
                      {showAllMovies ? 'Show Less' : `View All ${movieCredits.length} Movies`}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* TV Show Credits */}
            {tvCredits.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-3 text-left">TV Shows</h3>
                <div className="grid grid-cols-3 gap-3">
                  {(showAllTVShows ? tvCredits : tvCredits.slice(0, 9)).map((show, index) => (
                    <motion.div
                      key={`tv-${show.id}-${index}`}
                      className="group cursor-pointer"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => router.push(`/tv-shows/${show.id}`)}
                    >
                      <div className="aspect-[2/3] rounded-xl overflow-hidden bg-gray-800 shadow-lg relative">
                        {show.poster_path ? (
                          <Image
                            src={`https://image.tmdb.org/t/p/w300${show.poster_path}`}
                            alt={show.name}
                            width={300}
                            height={450}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800">
                            <User className="w-8 h-8 text-gray-500" />
                          </div>
                        )}
                        
                        {/* Rating Overlay */}
                        <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm rounded-lg px-2 py-1">
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-400" />
                            <span className="text-white text-xs font-medium">{show.vote_average.toFixed(1)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-2">
                        <h4 className="font-medium text-xs line-clamp-2 text-white leading-tight">
                          {show.name}
                        </h4>
                        <p className="text-xs text-gray-400 line-clamp-1 mt-1">
                          {show.first_air_date ? new Date(show.first_air_date).getFullYear() : 'TBA'}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
                
                {tvCredits.length > 9 && (
                  <div className="text-center mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAllTVShows(!showAllTVShows)}
                      className="bg-white/5 hover:bg-white/10 border-white/20 text-gray-300 hover:text-white text-sm px-4"
                    >
                      {showAllTVShows ? 'Show Less' : `View All ${tvCredits.length} TV Shows`}
                    </Button>
                  </div>
                )}
              </div>
            )}
            </>
          ) : (
            // No Credits Placeholder
            <div className="text-center py-8">
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
                  <User className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-white font-semibold mb-2">No Credits Found</h3>
                <p className="text-gray-400 text-sm">
                  This person doesn't have any movie or TV show credits available.
                </p>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Desktop Known For Section */}
      <div className="hidden md:block max-w-7xl mx-auto px-4 pb-8">
        <div className="mt-16">
          {(movieCredits.length > 0 || tvCredits.length > 0) ? (
            <>
            
            {/* Movie Credits */}
            {movieCredits.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mb-12"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold">Movies</h3>
                  {userIsAdmin && (
                    <div className="flex items-center gap-2">
                      {isPersonBlocked ? (
                        <Button
                          onClick={handleUnblockPerson}
                          size="sm"
                          variant="outline"
                          className="bg-indigo-500/20 border-indigo-500 text-indigo-400 hover:bg-indigo-500/30"
                        >
                          <Shield className="w-4 h-4 mr-2" />
                          Unblock Person
                        </Button>
                      ) : (
                        <Button
                          onClick={() => setShowBlockDialog(true)}
                          size="sm"
                          variant="outline"
                          className="bg-red-500/20 border-red-500 text-red-400 hover:bg-red-500/30"
                        >
                          <Ban className="w-4 h-4 mr-2" />
                          Block Person
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {movieCredits.map((movie, index) => (
                    <motion.div
                      key={`movie-${movie.id}-${index}`}
                      className="group cursor-pointer relative"
                      whileHover={{ scale: 1.05 }}
                      onClick={() => router.push(`/movies/${movie.id}`)}
                    >
                      <div className="aspect-[2/3] rounded-lg overflow-hidden bg-gray-800 relative">
                        <Image
                          src={`https://image.tmdb.org/t/p/w300${movie.poster_path}`}
                          alt={movie.title}
                          width={300}
                          height={450}
                          className="w-full h-full object-cover transition-transform group-hover:scale-110"
                        />
                        
                        {/* Admin Controls - Show on hover */}
                        {userIsAdmin && (
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                              {isPersonBlocked ? (
                                <Button
                                  onClick={handleUnblockPerson}
                                  size="sm"
                                  className="bg-indigo-500 hover:bg-indigo-600 text-white"
                                >
                                  <Shield className="w-4 h-4" />
                                </Button>
                              ) : (
                                <Button
                                  onClick={() => setShowBlockDialog(true)}
                                  size="sm"
                                  className="bg-red-500 hover:bg-red-600 text-white"
                                >
                                  <Ban className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="mt-2">
                        <h4 className="font-medium text-sm line-clamp-2">{movie.title}</h4>
                        {movie.vote_average !== undefined && movie.vote_average !== null && (
                          <div className="flex items-center gap-1 mt-1">
                            <Star className="w-3 h-3 text-yellow-500" />
                            <span className="text-xs text-gray-400">{movie.vote_average.toFixed(1)}</span>
                          </div>
                        )}
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                          as {movie.character}
                        </p>
                        <p className="text-xs text-gray-500">
                          {movie.release_date ? new Date(movie.release_date).getFullYear() : 'TBA'}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* TV Show Credits */}
            {tvCredits.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold">TV Shows</h3>
                  {userIsAdmin && (
                    <div className="flex items-center gap-2">
                      {isPersonBlocked ? (
                        <Button
                          onClick={handleUnblockPerson}
                          size="sm"
                          variant="outline"
                          className="bg-indigo-500/20 border-indigo-500 text-indigo-400 hover:bg-indigo-500/30"
                        >
                          <Shield className="w-4 h-4 mr-2" />
                          Unblock Person
                        </Button>
                      ) : (
                        <Button
                          onClick={() => setShowBlockDialog(true)}
                          size="sm"
                          variant="outline"
                          className="bg-red-500/20 border-red-500 text-red-400 hover:bg-red-500/30"
                        >
                          <Ban className="w-4 h-4 mr-2" />
                          Block Person
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {tvCredits.map((show, index) => (
                    <motion.div
                      key={`tv-${show.id}-${index}`}
                      className="group cursor-pointer relative"
                      whileHover={{ scale: 1.05 }}
                      onClick={() => router.push(`/tv-shows/${show.id}`)}
                    >
                      <div className="aspect-[2/3] rounded-lg overflow-hidden bg-gray-800 relative">
                        <Image
                          src={`https://image.tmdb.org/t/p/w300${show.poster_path}`}
                          alt={show.name}
                          width={300}
                          height={450}
                          className="w-full h-full object-cover transition-transform group-hover:scale-110"
                        />
                        
                        {/* Admin Controls - Show on hover */}
                        {userIsAdmin && (
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                              {isPersonBlocked ? (
                                <Button
                                  onClick={handleUnblockPerson}
                                  size="sm"
                                  className="bg-indigo-500 hover:bg-indigo-600 text-white"
                                >
                                  <Shield className="w-4 h-4" />
                                </Button>
                              ) : (
                                <Button
                                  onClick={() => setShowBlockDialog(true)}
                                  size="sm"
                                  className="bg-red-500 hover:bg-red-600 text-white"
                                >
                                  <Ban className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="mt-2">
                        <h4 className="font-medium text-sm line-clamp-2">{show.name}</h4>
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="w-3 h-3 text-yellow-500" />
                          <span className="text-xs text-gray-400">{show.vote_average.toFixed(1)}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                          as {show.character}
                        </p>
                        <p className="text-xs text-gray-500">
                          {show.first_air_date ? new Date(show.first_air_date).getFullYear() : 'TBA'}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
            </>
          ) : (
            // No Credits Placeholder
            <div className="text-center py-12">
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-8 max-w-md mx-auto">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/10 flex items-center justify-center">
                  <User className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-white font-semibold mb-3 text-lg">No Credits Found</h3>
                <p className="text-gray-400">
                  This person doesn't have any movie or TV show credits available in our database.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Block Confirmation Dialog */}
      {userIsAdmin && (
        <BlockConfirmDialog
          isOpen={showBlockDialog}
          onClose={() => setShowBlockDialog(false)}
          onConfirm={handleBlockConfirm}
          title={person?.name || 'Unknown Person'}
          isAdmin={true}
          isPersonBlock={true}
        />
      )}
    </div>
  );
}
