// app/movies/page.tsx
"use client";

import React from "react";
import MoviesContainer from "@/components/movies/MoviesContainer";
import MobileMoviesContainer from "@/components/movies/MobileMoviesContainer";

export default function MoviesPage() {
  return (
    <>
      {/* Mobile Version */}
      <div className="md:hidden">
        <MobileMoviesContainer />
      </div>
      
      {/* Desktop Version */}
      <div className="hidden md:block">
        <MoviesContainer />
      </div>
    </>
  );
}