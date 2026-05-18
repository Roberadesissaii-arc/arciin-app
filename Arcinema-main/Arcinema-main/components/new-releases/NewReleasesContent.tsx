"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import MovieGrid from "@/components/movies/MovieGrid";

interface Filters {
  genres: number[];
  rating: number;
  year: number | null;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  language: string;
  adult: boolean;
}

interface NewReleasesContentProps {
  activeSection: {
    id: string;
    type: "movie" | "tv";
  };
  filters: Filters;
  isLoading: boolean;
}

export default function NewReleasesContent({
  activeSection,
  filters,
  isLoading,
}: NewReleasesContentProps) {
  return (
    <div className="bg-black/50 backdrop-blur-sm border border-white/10 rounded-none sm:rounded-xl p-6 overflow-x-hidden">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full overflow-x-hidden"
      >
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[500px]">
            <Loader2 className="w-8 h-8 animate-spin text-white/80" />
          </div>
        ) : (
          <MovieGrid
            section={activeSection.id}
            mediaType={activeSection.type}
            filters={filters}
            initialCount={20}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-6"
          />
        )}
      </motion.div>
    </div>
  );
}
