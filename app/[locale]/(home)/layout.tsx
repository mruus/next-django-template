"use client";

import {
  menuTypeAtom,
  sidebarOpenAtom,
  isDesktopAtom,
  breakpointReadyAtom,
} from "@/atoms/menu";
import { useAtom } from "jotai";
import HorizontalHeader from "./components/horizantal";
import VerticalSidebar from "./components/vertical";
import RouteBreadcrumb from "./components/route-breadcrumb";
import { cn } from "@/lib/utils";
import { useEffect } from "react";
import { usePathname } from "@/lib/navigation";
import { Menu } from "lucide-react";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { PermissionsConnectionStatus } from "@/app/[locale]/(home)/components/permissions-connection-status";

interface HomeProps {
  children: React.ReactNode;
}

function HomePage({ children }: HomeProps) {
  useBreakpoint();

  const [menuType] = useAtom(menuTypeAtom);
  const [sidebarOpen, setSidebarOpen] = useAtom(sidebarOpenAtom);
  const [isDesktop] = useAtom(isDesktopAtom);
  const [breakpointReady] = useAtom(breakpointReadyAtom);
  const pathname = usePathname();

  // Auto-close only on mobile when navigating — skip until breakpoint is known
  useEffect(() => {
    if (!breakpointReady) return;
    if (!isDesktop) {
      setSidebarOpen(false);
    }
  }, [pathname, isDesktop, breakpointReady, setSidebarOpen]);

  return (
    <div
      className={cn(
        "w-full h-full bg-background text-foreground",
        menuType === "horizontal" ? "flex flex-col" : "flex flex-row",
      )}
    >
      {menuType === "horizontal" && <HorizontalHeader />}
      {menuType === "vertical" && (
        <VerticalSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      )}

      <main
        className={cn(
          "bg-background overflow-y-auto flex-1",
          menuType === "horizontal" ? "pt-10 px-4 lg:px-45.5" : "p-6",
        )}
      >
        {menuType === "vertical" && (
          <div className="mb-5 flex items-center gap-3">
            <button
              className="text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setSidebarOpen((v) => !v)}
            >
              <Menu size={20} />
            </button>
            <RouteBreadcrumb />
          </div>
        )}
        {menuType === "horizontal" && (
          <div className="mb-5">
            <RouteBreadcrumb />
          </div>
        )}
        <PermissionsConnectionStatus />
        {children}
      </main>
    </div>
  );
}

export default HomePage;
