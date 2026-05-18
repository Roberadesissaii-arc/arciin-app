// app/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Hero from "@/components/layout/Hero";
import HomeRow from "@/components/home/HomeRow";
import MobileHome from "@/components/layout/mobile/MobileHome";

const TMDB = "https://api.themoviedb.org/3";

const ROWS = [
  { title: "Trending Movies",      endpoint: `${TMDB}/trending/movie/day?language=en-US`,          mediaType: "movie" as const },
  { title: "Trending TV Shows",    endpoint: `${TMDB}/trending/tv/day?language=en-US`,             mediaType: "tv"    as const },
  { title: "Popular Movies",       endpoint: `${TMDB}/movie/popular?language=en-US`,               mediaType: "movie" as const },
  { title: "Top Rated Movies",     endpoint: `${TMDB}/movie/top_rated?language=en-US`,             mediaType: "movie" as const },
  { title: "Popular TV Shows",     endpoint: `${TMDB}/tv/popular?language=en-US`,                  mediaType: "tv"    as const },
  { title: "Top Rated TV Shows",   endpoint: `${TMDB}/tv/top_rated?language=en-US`,                mediaType: "tv"    as const },
  { title: "Upcoming Movies",      endpoint: `${TMDB}/movie/upcoming?language=en-US`,              mediaType: "movie" as const },
  { title: "Now Playing",          endpoint: `${TMDB}/movie/now_playing?language=en-US`,           mediaType: "movie" as const },
  { title: "Airing Today",         endpoint: `${TMDB}/tv/airing_today?language=en-US`,             mediaType: "tv"    as const },
  { title: "Action Movies",        endpoint: `${TMDB}/discover/movie?with_genres=28&sort_by=popularity.desc&language=en-US`,   mediaType: "movie" as const },
  { title: "Sci-Fi Movies",        endpoint: `${TMDB}/discover/movie?with_genres=878&sort_by=popularity.desc&language=en-US`,  mediaType: "movie" as const },
  { title: "Comedy Movies",        endpoint: `${TMDB}/discover/movie?with_genres=35&sort_by=popularity.desc&language=en-US`,   mediaType: "movie" as const },
];

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/auth/login");
      } else {
        setPageLoading(false);
        window.scrollTo({ top: 0, behavior: "instant" });
      }
    }
  }, [user, loading, router]);

  if (loading || pageLoading) return null;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-black">
      {/* Mobile */}
      <div className="md:hidden">
        <MobileHome />
      </div>

      {/* Desktop */}
      <div className="hidden md:block">
        <Hero />

        <div className="relative z-10 pt-4 pb-8">
          {ROWS.map((row) => (
            <HomeRow
              key={row.title}
              title={row.title}
              endpoint={row.endpoint}
              mediaType={row.mediaType}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
