import UserActivity from "@/components/user/UserActivity";
import MobileUserActivity from "@/components/user/mobile/MobileUserActivity";

export default function ActivityPage() {
  return (
    <>
      {/* Mobile Version */}
      <div className="md:hidden">
        <MobileUserActivity />
      </div>

      {/* Desktop Version */}
      <div className="hidden md:block">
        <UserActivity />
      </div>
    </>
  );
}
