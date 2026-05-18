import LoginForm from "@/components/auth/LoginForm";
import MobileLoginForm from "@/components/auth/mobile/MobileLoginForm";

export default function LoginPage() {
  return (
    <>
      {/* Mobile Version */}
      <div className="md:hidden">
        <MobileLoginForm />
      </div>

      {/* Desktop Version */}
      <div className="hidden md:block">
        <LoginForm />
      </div>
    </>
  );
}
