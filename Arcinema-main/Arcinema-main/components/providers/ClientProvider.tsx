// components/providers/ClientProvider.tsx
"use client";

import { useEffect } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { SidebarProvider } from "@/contexts/SidebarContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { notificationInitService } from "@/lib/features/notifications/notificationInit";

interface ClientProviderProps {
  children: React.ReactNode;
}

function NotificationInitializer() {
  const { user } = useAuth();

  useEffect(() => {
    if (user?.uid) {
      notificationInitService.initialize(user.uid);
    } else {
      notificationInitService.reset();
    }
  }, [user?.uid]);

  return null;
}

export default function ClientProvider({ children }: ClientProviderProps) {
  return (
    <AuthProvider>
      <SidebarProvider>
        <NotificationInitializer />
        <ProtectedRoute>
          {children}
        </ProtectedRoute>
      </SidebarProvider>
    </AuthProvider>
  );
}