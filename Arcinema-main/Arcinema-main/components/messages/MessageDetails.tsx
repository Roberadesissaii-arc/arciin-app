// app/messages/[userId]/page.tsx
"use client";

import React from "react";
import MobileMessageDetails from "@/components/messages/mobile/MobileMessageDetails";
import DesktopMessageDetails from "@/components/messages/desktop/DesktopMessageDetails";

export default function MessageDetails() {
  return (
    <>
      {/* Mobile Version */}
      <div className="md:hidden">
        <MobileMessageDetails />
      </div>
      
      {/* Desktop Version */}
      <div className="hidden md:block">
        <DesktopMessageDetails />
      </div>
    </>
  );
}

