// app/tv-shows/page.tsx
"use client";

import React from "react";
import TVShowContainer from "@/components/tv-shows/TVShowContainer";
import MobileTVShowContainer from "@/components/tv-shows/MobileTVShowContainer";

export default function TVShowsPage() {
  return (
    <>
      {/* Mobile Version */}
      <div className="md:hidden">
        <MobileTVShowContainer />
      </div>
      
      {/* Desktop Version */}
      <div className="hidden md:block">
        <TVShowContainer />
      </div>
    </>
  );
}