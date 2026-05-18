import UserSharedFolders from "@/components/user/UserSharedFolders";
import MobileUserSharedFolders from "@/components/user/mobile/MobileUserSharedFolders";

export default function SharedFoldersPage() {
  return (
    <>
      {/* Mobile Version */}
      <div className="md:hidden">
        <MobileUserSharedFolders />
      </div>

      {/* Desktop Version */}
      <div className="hidden md:block">
        <UserSharedFolders />
      </div>
    </>
  );
}
