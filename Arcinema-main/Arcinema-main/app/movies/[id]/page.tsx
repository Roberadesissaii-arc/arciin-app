// app/movies/[id]/page.tsx
"use client";

import React from "react";
import { useParams } from "next/navigation";
import { MovieDetailsContainer } from "@/components/movies/detail/MovieDetailsContainer";
import { MobileMovieDetail } from "@/components/movies/mobile/MobileMovieDetail";

export const dynamic = 'force-dynamic';

const MovieDetailPage = () => {
  const params = useParams();
  const movieId = params.id as string;

  return (
    <>
      {/* Mobile Version */}
      <div className="md:hidden">
        <MobileMovieDetail movieId={movieId} />
      </div>

      {/* Desktop Version */}
      <div className="hidden md:block">
        <MovieDetailsContainer movieId={movieId} />
      </div>
    </>
  );
};

export default MovieDetailPage;