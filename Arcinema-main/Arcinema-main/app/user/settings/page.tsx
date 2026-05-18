import UserSettings from "@/components/user/UserSettings";
import MobileSettings from "@/components/user/settings/mobile/MobileSettings";

export default function SettingsPage() {
  return (
    <>
      {/* Mobile Version */}
      <div className="md:hidden">
        <MobileSettings />
      </div>

      {/* Desktop Version */}
      <div className="hidden md:block">
        <UserSettings />
      </div>
    </>
  );
}
