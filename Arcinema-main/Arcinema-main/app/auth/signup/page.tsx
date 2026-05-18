import SignupForm from "@/components/auth/SignupForm";
import MobileSignupForm from "@/components/auth/mobile/MobileSignupForm";

export default function SignupPage() {
  return (
    <>
      {/* Mobile Version */}
      <div className="md:hidden">
        <MobileSignupForm />
      </div>

      {/* Desktop Version */}
      <div className="hidden md:block">
        <SignupForm />
      </div>
    </>
  );
}
