"use client";

import { cn } from "@/lib/utils";
import { useSidebar } from "@/contexts/SidebarContext";
import { usePathname } from "next/navigation";

const AUTH_ROUTES = ["/auth/login", "/auth/signup"];

export function PageWrapper({ children }: { children: React.ReactNode }) {
  const { sidebarOpen } = useSidebar();
  const pathname = usePathname();
  const isAuthPage = AUTH_ROUTES.includes(pathname ?? "");

  return (
    <div
      className={cn(
        "flex-1 min-w-0 transition-[margin] duration-300 ease-in-out",
        !isAuthPage && (sidebarOpen ? "xl:ml-[240px]" : "xl:ml-[60px]")
      )}
    >
      {children}
    </div>
  );
}
