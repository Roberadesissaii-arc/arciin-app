// components/ui/enhanced-image.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { ImagePlaceholder } from "@/components/movies/cards/MoviePlaceholder";
import { cn } from "@/lib/utils";

interface EnhancedImageProps {
  src: string;
  alt: string;
  fallbackSrc?: string;
  placeholder?: React.ReactNode;
  className?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  priority?: boolean;
  showPlaceholderOnError?: boolean;
}

export default function EnhancedImage({
  src,
  alt,
  fallbackSrc,
  placeholder,
  className,
  fill,
  width,
  height,
  priority,
  showPlaceholderOnError = true,
  ...props
}: EnhancedImageProps) {
  const [error, setError] = useState(false);
  const [fallbackError, setFallbackError] = useState(false);

  const handleError = () => {
    setError(true);
  };

  const handleFallbackError = () => {
    setFallbackError(true);
  };

  // If both main image and fallback failed, show placeholder
  if (error && (!fallbackSrc || fallbackError)) {
    if (showPlaceholderOnError) {
      return placeholder || (
        <ImagePlaceholder 
          className={cn("w-full h-full", className)}
          iconSize="w-8 h-8"
        />
      );
    }
    return null;
  }

  // If main image failed but we have a fallback
  if (error && fallbackSrc && !fallbackError) {
    return (
      <Image
        src={fallbackSrc}
        alt={alt}
        fill={fill}
        width={width}
        height={height}
        className={className}
        priority={priority}
        onError={handleFallbackError}
        {...props}
      />
    );
  }

  // Show main image
  return (
    <Image
      src={src}
      alt={alt}
      fill={fill}
      width={width}
      height={height}
      className={className}
      priority={priority}
      onError={handleError}
      {...props}
    />
  );
}
