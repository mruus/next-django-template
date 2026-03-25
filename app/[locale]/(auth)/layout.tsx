"use client";

import ThemeDrawer from "@/app/[locale]/(home)/components/drawer-theme";
import { PatternBackground } from "@/components/bg-scattered-pattern";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative w-full h-full">
      <PatternBackground count={1000} size="sm" className="z-0" />
      <div>{children}</div>
      <div className="fixed bottom-4 start-4 z-50">
        <ThemeDrawer />
      </div>
    </div>
  );
}
