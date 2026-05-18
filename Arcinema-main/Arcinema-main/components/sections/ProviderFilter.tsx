"use client";

import { cn } from "@/lib/utils";
import { PROVIDERS } from "@/lib/features/providers/providerMapping";
import Image from "next/image";

interface ProviderFilterProps {
  selectedProviders: string[];
  onProviderChange: (providers: string[]) => void;
}

const ACTIVE_BG  = "rgba(255,255,255,0.1)";
const HOVER_BG   = "rgba(255,255,255,0.05)";
const BORDER     = "rgba(255,255,255,0.1)";
const PURPLE     = "var(--accent-color, #5D5FEF)";

const mainProviders = PROVIDERS.filter(p =>
  ['netflix', 'disney', 'prime-video', 'hbomax', 'hulu', 'apple-tv', 'paramount', 'peacock'].includes(p.id)
);

export default function ProviderFilter({ selectedProviders, onProviderChange }: ProviderFilterProps) {
  const toggleProvider = (providerId: string) => {
    onProviderChange(selectedProviders.includes(providerId) ? [] : [providerId]);
  };

  return (
    <div className="px-4 mb-4 flex items-center gap-2">
      <span className="text-[11px] font-medium shrink-0" style={{ color: "rgba(255,255,255,0.3)" }}>
        Watch on
      </span>
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
        {mainProviders.map(provider => {
          const isSelected = selectedProviders.includes(provider.id);
          return (
            <button
              key={provider.id}
              onClick={() => toggleProvider(provider.id)}
              title={provider.name}
              className="relative shrink-0 w-7 h-7 rounded-lg overflow-hidden transition-all duration-200"
              style={{
                outline: isSelected ? `2px solid ${PURPLE}` : `1px solid ${BORDER}`,
                outlineOffset: isSelected ? "1px" : "0px",
                opacity: !isSelected && selectedProviders.length > 0 ? 0.4 : 1,
              }}
            >
              <Image
                src={provider.logo}
                alt={provider.name}
                fill
                className="object-cover"
                sizes="28px"
              />
            </button>
          );
        })}
        {selectedProviders.length > 0 && (
          <button
            onClick={() => onProviderChange([])}
            className="shrink-0 text-[11px] px-2 py-1 rounded-md transition-colors"
            style={{ color: "rgba(255,255,255,0.4)", background: HOVER_BG }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.8)"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.4)"}
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
