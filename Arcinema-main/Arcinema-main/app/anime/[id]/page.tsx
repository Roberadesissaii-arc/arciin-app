// app/anime/[id]/page.tsx
"use client";

import React from "react";
import { useParams } from "next/navigation";
import { AnimeDetailsContainer } from "@/components/anime/detail/AnimeDetailsContainer";

export const dynamic = 'force-dynamic';

const AnimeDetailPage = () => {
  const params = useParams();
  const animeId = params.id as string;

  return <AnimeDetailsContainer animeId={animeId} />;
};

export default AnimeDetailPage;