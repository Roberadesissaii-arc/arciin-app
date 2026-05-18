// app/cineai/page.tsx
"use client";

import React from "react";
import CineAIContainer from "@/components/cineai/desktop/CineAIContainer";
import MobileCineAIContainer from "@/components/cineai/mobile/MobileCineAIContainer";

export default function CineAIPage() {
  return (
    <>
      {/* Mobile Version */}
      <div className="md:hidden">
        <MobileCineAIContainer />
      </div>
      
      {/* Desktop Version */}
      <div className="hidden md:block">
        <CineAIContainer />
      </div>
    </>
  );
}
