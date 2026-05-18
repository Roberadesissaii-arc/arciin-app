// components/ui/card-skeleton.tsx
"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface CardSkeletonProps {
  viewMode?: 'grid' | 'list';
  className?: string;
  count?: number;
}

function SingleCardSkeleton({ viewMode = 'grid', className }: { viewMode?: 'grid' | 'list'; className?: string }) {
  if (viewMode === 'list') {
    return (
      <div className={cn(
        "bg-gray-800/50 rounded-lg overflow-hidden animate-pulse",
        className
      )}>
        <div className="flex items-center gap-4 p-4">
          {/* Poster skeleton */}
          <div className="h-[150px] w-[100px] bg-gray-700/50 rounded shrink-0" />
          
          {/* Content skeleton */}
          <div className="flex-1 space-y-3">
            {/* Title */}
            <div className="h-6 bg-gray-700/50 rounded w-3/4" />
            
            {/* Meta info */}
            <div className="flex items-center gap-2">
              <div className="h-5 bg-gray-700/50 rounded w-16" />
              <div className="h-5 bg-gray-700/50 rounded w-20" />
            </div>
            
            {/* Description */}
            <div className="space-y-2">
              <div className="h-4 bg-gray-700/50 rounded w-full" />
              <div className="h-4 bg-gray-700/50 rounded w-2/3" />
            </div>
          </div>
          
          {/* Action buttons skeleton */}
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 bg-gray-700/50 rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        "group relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-800/50 animate-pulse",
        className
      )}
    >
      {/* Poster skeleton */}
      <div className="absolute inset-0 bg-gray-700/50" />
      
      {/* Content overlay skeleton */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60">
        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 space-y-3">
          {/* Title skeleton */}
          <div className="h-5 bg-gray-600/70 rounded w-3/4" />
          
          {/* Meta info skeleton */}
          <div className="flex items-center gap-2">
            <div className="h-4 bg-gray-600/70 rounded w-16" />
            <div className="h-4 bg-gray-600/70 rounded w-20" />
          </div>
          
          {/* Buttons skeleton */}
          <div className="space-y-2">
            <div className="h-8 bg-gray-600/70 rounded w-full" />
            <div className="flex gap-2">
              <div className="h-8 bg-gray-600/70 rounded flex-1" />
              <div className="h-8 w-8 bg-gray-600/70 rounded" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function CardSkeleton({ 
  viewMode = 'grid', 
  className, 
  count = 1 
}: CardSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <SingleCardSkeleton 
          key={index} 
          viewMode={viewMode} 
          className={className}
        />
      ))}
    </>
  );
}
