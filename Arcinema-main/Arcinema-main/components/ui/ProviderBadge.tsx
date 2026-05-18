"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { Provider, ProviderBadgeProps } from "@/lib/features/providers/providerMapping";

export default function ProviderBadge({ 
  provider, 
  size = 'medium', 
  className 
}: ProviderBadgeProps) {
  const sizeClasses = {
    small: 'w-8 h-6',
    medium: 'w-12 h-8', 
    large: 'w-16 h-10'
  };

  return (
    <div 
      className={cn(
        "relative rounded-md overflow-hidden bg-black/60 backdrop-blur-sm border border-white/20 shadow-lg",
        sizeClasses[size],
        className
      )}
      title={`Available on ${provider.name}`}
    >
      <Image
        src={provider.logo}
        alt={provider.name}
        fill
        className="object-contain p-1"
        sizes={size === 'small' ? '32px' : size === 'medium' ? '48px' : '64px'}
      />
    </div>
  );
}