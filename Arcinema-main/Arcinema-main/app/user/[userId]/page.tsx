import PublicUserProfile from "@/components/user/PublicUserProfile";
import MobilePublicUserProfile from "@/components/user/mobile/MobilePublicUserProfile";

export default function UserProfilePage() {
  return (
    <>
      {/* Mobile Version */}
      <div className="md:hidden">
        <MobilePublicUserProfile />
      </div>

      {/* Desktop Version */}
      <div className="hidden md:block">
        <PublicUserProfile />
      </div>
    </>
  );
}

