"use client";

import UserProfile from "@/components/user/UserProfile";
import MobileUserProfile from "@/components/user/mobile/MobileUserProfile";

export default function ProfilePage() {
  return (
    <>
      {/* Mobile Version */}
      <div className="md:hidden">
        <MobileUserProfile />
      </div>
      
      {/* Desktop Version */}
      <div className="hidden md:block">
        <UserProfile />
      </div>
    </>
  );
}
