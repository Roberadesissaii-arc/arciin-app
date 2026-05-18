// contexts/CountryContext.tsx
"use client";

import React, { createContext, useContext, ReactNode } from 'react';
import { useUserSettings } from '@/hooks/useUserSettings';

interface CountryContextType {
  currentCountry: string;
  countryName: string;
  isAllCountries: boolean;
}

const CountryContext = createContext<CountryContextType | undefined>(undefined);

const countryNames: Record<string, string> = {
  'all': 'All Countries',
  'US': 'United States',
  'GB': 'United Kingdom',
  'CA': 'Canada',
  'FR': 'France',
  'DE': 'Germany',
  'IT': 'Italy',
  'ES': 'Spain',
  'JP': 'Japan',
  'KR': 'South Korea',
  'IN': 'India',
  'AU': 'Australia',
  'BR': 'Brazil',
  'MX': 'Mexico',
  'RU': 'Russia',
  'CN': 'China',
};

interface CountryProviderProps {
  children: ReactNode;
}

export function CountryProvider({ children }: CountryProviderProps) {
  const { settings } = useUserSettings();
  
  const currentCountry = settings?.preferences?.country || 'all';
  const countryName = countryNames[currentCountry] || currentCountry;
  const isAllCountries = currentCountry === 'all';

  const value: CountryContextType = {
    currentCountry,
    countryName,
    isAllCountries,
  };

  return (
    <CountryContext.Provider value={value}>
      {children}
    </CountryContext.Provider>
  );
}

export function useCountry() {
  const context = useContext(CountryContext);
  if (context === undefined) {
    throw new Error('useCountry must be used within a CountryProvider');
  }
  return context;
}

export { countryNames };
