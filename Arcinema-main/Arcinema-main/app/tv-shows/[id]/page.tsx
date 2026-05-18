// app/tv-shows/[id]/page.tsx
"use client";

import React from "react";
import { useParams } from "next/navigation";
import { TVShowDetailsContainer } from "@/components/tv-shows/detail/TVShowDetailsContainer";
import { MobileTVShowDetail } from "@/components/tv-shows/mobile/MobileTVShowDetail";

export const dynamic = 'force-dynamic';

const TVShowDetailPage = () => {
  const params = useParams();
  const showId = params.id as string;

  return (
    <>
      {/* Mobile Version */}
      <div className="md:hidden">
        <MobileTVShowDetail showId={showId} />
      </div>

      {/* Desktop Version */}
      <div className="hidden md:block">
        <TVShowDetailsContainer showId={showId} />
      </div>
    </>
  );
};

export default TVShowDetailPage;
