import NotificationsContainer from '@/components/notifications/NotificationsContainer';
import MobileNotificationsContainer from '@/components/notifications/mobile/MobileNotificationsContainer';

export default function NotificationsPage() {
  return (
    <>
      {/* Mobile Version */}
      <div className="md:hidden">
        <MobileNotificationsContainer />
      </div>

      {/* Desktop Version */}
      <div className="hidden md:block">
        <NotificationsContainer />
      </div>
    </>
  );
}
