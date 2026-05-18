"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Filter, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Section {
  id: string;
  label: string;
  type: "movie" | "tv";
  icon: any;
  description: string;
  gradient: string;
}

interface NewReleasesControlsProps {
  sections: Section[];
  activeSection: Section;
  onSectionChange: (sectionId: string) => void;
  showFilters: boolean;
  onFilterToggle: () => void;
  isMobileMenuOpen: boolean;
  onMobileMenuToggle: () => void;
  mobileMenuRef: React.RefObject<HTMLDivElement>;
  isOffline: boolean;
}

export default function NewReleasesControls({
  sections,
  activeSection,
  onSectionChange,
  showFilters,
  onFilterToggle,
  isMobileMenuOpen,
  onMobileMenuToggle,
  mobileMenuRef,
  isOffline,
}: NewReleasesControlsProps) {
  return (
    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between mb-4 gap-4">
      {/* Mobile Controls */}
      <div className="lg:hidden flex gap-3 w-full z-50">
        <div className="relative flex-1" ref={mobileMenuRef}>
          <button
            onClick={onMobileMenuToggle}
            className="w-full p-3 flex items-center justify-between 
                     bg-black/50 backdrop-blur-md border border-white/10 
                     rounded-xl hover:bg-white/10 transition-all"
            disabled={isOffline}
          >
            <div className="flex items-center gap-2">
              <activeSection.icon className="w-4 h-4" />
              <span className="text-sm font-medium truncate">{activeSection.label}</span>
            </div>
            <ChevronDown className={cn(
              "w-4 h-4 transition-transform duration-200 flex-shrink-0",
              isMobileMenuOpen && "rotate-180"
            )} />
          </button>

          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 0 }}
                animate={{ opacity: 1, y: 8 }}
                exit={{ opacity: 0, y: 0 }}
                className="absolute top-full left-0 right-0
                         bg-black/95 backdrop-blur-md border border-white/10 
                         rounded-xl overflow-hidden shadow-xl"
                style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}
              >
                {sections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.id}
                      onClick={() => onSectionChange(section.id)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 transition-all",
                        "hover:bg-white/5",
                        activeSection.id === section.id && "bg-indigo-500/20"
                      )}
                      disabled={isOffline}
                    >
                      <Icon className="w-4 h-4" />
                      <div className="flex flex-col items-start">
                        <span className="font-medium text-sm">{section.label}</span>
                        <span className="text-xs text-gray-400">
                          {section.description}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Button
          variant="outline"
          onClick={onFilterToggle}
          className={cn(
            "px-4 h-auto py-3 flex-shrink-0",
            showFilters && "bg-indigo-500 hover:bg-indigo-600 text-white border-indigo-500"
          )}
          disabled={isOffline}
        >
          <Filter className="w-4 h-4" />
        </Button>
      </div>

      {/* Desktop Menu */}
      <div className="hidden lg:flex gap-2 flex-wrap">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Button
              key={section.id}
              variant={activeSection.id === section.id ? "default" : "outline"}
              onClick={() => onSectionChange(section.id)}
              className={cn(
                "gap-2 text-sm transition-all",
                activeSection.id === section.id && 
                  "bg-indigo-500 hover:bg-indigo-600 text-white border-indigo-500"
              )}
              disabled={isOffline}
            >
              <Icon className="w-4 h-4" />
              <span>{section.label}</span>
            </Button>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 lg:gap-4">
        <Button
          variant="outline"
          onClick={onFilterToggle}
          className={cn(
            "gap-2 w-full sm:w-auto hidden lg:flex",
            showFilters && "bg-indigo-500 hover:bg-indigo-600 text-white"
          )}
          disabled={isOffline}
        >
          <Filter className="w-4 h-4" />
          <span>Filters</span>
        </Button>
      </div>
    </div>
  );
}
