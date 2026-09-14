"use client";

import { useCallback, useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { useAppBranding } from "../../lib/branding-context";
import { Button } from "../ui/button";
import { AppSidebar } from "./app-sidebar";
import { getMobileNavToggleLabel, shouldShowMobileNavBackdrop } from "./shell-policy";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { branding } = useAppBranding();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isDesktopNav, setIsDesktopNav] = useState(false);

  const closeMobileNav = useCallback(() => setMobileNavOpen(false), []);
  const toggleMobileNav = useCallback(() => setMobileNavOpen((open) => !open), []);

  useEffect(() => {
    if (!mobileNavOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMobileNav();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileNavOpen, closeMobileNav]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 768px)");
    const onViewportChange = () => {
      setIsDesktopNav(mediaQuery.matches);
      if (mediaQuery.matches) closeMobileNav();
    };

    setIsDesktopNav(mediaQuery.matches);
    mediaQuery.addEventListener("change", onViewportChange);
    return () => mediaQuery.removeEventListener("change", onViewportChange);
  }, [closeMobileNav]);

  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileNavOpen]);

  return (
    <div className="flex min-h-screen bg-canvas">
      {shouldShowMobileNavBackdrop(mobileNavOpen) ? (
        <button
          type="button"
          aria-label="Close navigation menu"
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={closeMobileNav}
        />
      ) : null}

      <AppSidebar
        isMobileOpen={mobileNavOpen}
        isSidebarAccessible={isDesktopNav || mobileNavOpen}
        onNavigate={closeMobileNav}
      />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-expanded={mobileNavOpen}
            aria-controls="app-sidebar"
            aria-label={getMobileNavToggleLabel(mobileNavOpen)}
            onClick={toggleMobileNav}
          >
            {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
          </Button>
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-semibold text-primary">{branding.schoolName}</p>
          </div>
        </div>

        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
