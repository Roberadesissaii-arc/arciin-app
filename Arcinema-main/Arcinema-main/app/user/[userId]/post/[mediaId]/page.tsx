"use client";

import { useParams, useSearchParams } from "next/navigation";
import MediaPost from "@/components/user/MediaPost";
import MobileMediaPost from "@/components/user/mobile/MobileMediaPost";

export default function MediaPostPage() {
  return (
    <>
      {/* Mobile Version */}
      <div className="md:hidden">
        <MobileMediaPost />
      </div>

      {/* Desktop Version */}
      <div className="hidden md:block">
        <MediaPost />
      </div>
    </>
  );
}

