// components/auth/ProtectedRoute.tsx
"use client";

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

const PUBLIC_PATHS = ['/auth/login', '/auth/signup'];

// Share pages that can be viewed without login (guest access)
const GUEST_ALLOWED_PATTERNS = [
  /^\/share\/[A-Za-z0-9_-]+$/,  // /share/[unique-id]
];

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isPublicPath = PUBLIC_PATHS.includes(pathname);
  const isGuestAllowed = GUEST_ALLOWED_PATTERNS.some(pattern => pattern.test(pathname));

  useEffect(() => {
    if (!loading) {  // Only run after initial auth check
      if (!user && !isPublicPath && !isGuestAllowed) {
        // No user and trying to access protected route
        router.push('/auth/login');
      } else if (user && isPublicPath) {
        // User is logged in but trying to access login/signup
        router.push('/');
      }
    }
  }, [user, loading, pathname, router, isPublicPath, isGuestAllowed]);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden">
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 opacity-[0.02] grid-pattern" />
        
        {/* Minimal elegant loading */}
        <div className="relative z-10 text-center space-y-8 px-4">
          {/* Simple ring spinner */}
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 rounded-full border-[1px] border-white/5" />
            <div className="absolute inset-0 rounded-full border-[1px] border-transparent border-t-white/40 animate-spin-slow" />
          </div>
          
          {/* Logo name only */}
          <h1 className="text-3xl text-white/90 tracking-[0.3em] uppercase font-galindo">
            Arcinema
          </h1>
        </div>
      </div>
    );
  }

  // Don't render protected content if not authenticated
  if (!user && !isPublicPath && !isGuestAllowed) {
    return null;
  }

  return children;
}