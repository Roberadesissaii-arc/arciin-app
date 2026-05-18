import UserMyList from "@/components/user/UserMyList";
import MobileUserMyList from "@/components/user/mobile/MobileUserMyList";

export default function MyListPage() {
  return (
    <>
      {/* Mobile Version */}
      <div className="md:hidden">
        <MobileUserMyList />
      </div>

      {/* Desktop Version */}
      <div className="hidden md:block">
        <UserMyList />
      </div>
    </>
  );
}
