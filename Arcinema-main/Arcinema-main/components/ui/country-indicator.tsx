// components/ui/country-indicator.tsx
"use client";

import { Globe } from "lucide-react";
import { countryNames } from "@/contexts/CountryContext";

interface CountryIndicatorProps {
  country: string;
  className?: string;
}

export function CountryIndicator({ country, className = "" }: CountryIndicatorProps) {
  if (!country || country === 'all') {
    return null;
  }

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-md bg-purple-500/20 text-purple-400 text-xs ${className}`}>
      <Globe className="w-3 h-3 mr-1" />
      {countryNames[country] || country}
    </span>
  );
}
