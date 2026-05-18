"use client";

import { cn } from "@/lib/utils";
import { Flame, TrendingUp, Award, Clock } from "lucide-react";

interface TVTabsProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export const tvSections = [
  { id: "trending",     label: "Trending",     icon: Flame      },
  { id: "popular",      label: "Popular",      icon: TrendingUp },
  { id: "top_rated",    label: "Top Rated",    icon: Award      },
  { id: "airing_today", label: "Airing Today", icon: Clock      },
];

const ACTIVE_BG = "rgba(255,255,255,0.08)";
const HOVER_BG  = "rgba(255,255,255,0.04)";
const TEXT_OFF  = "rgba(255,255,255,0.5)";
const TEXT_ON   = "rgba(255,255,255,0.95)";

export default function TVTabs({ activeSection, onSectionChange }: TVTabsProps) {
  return (
    <div className="px-4 mb-6">
      <div className="flex items-center gap-1 flex-wrap">
        {tvSections.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSectionChange(tab.id)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors select-none"
              style={{
                background: isActive ? ACTIVE_BG : "transparent",
                color: isActive ? TEXT_ON : TEXT_OFF,
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = HOVER_BG;
                  (e.currentTarget as HTMLElement).style.color = TEXT_ON;
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = "transparent";
                  (e.currentTarget as HTMLElement).style.color = TEXT_OFF;
                }
              }}
            >
              <Icon className="w-[14px] h-[14px] shrink-0" />
              <span className="leading-none">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
