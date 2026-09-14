"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { api } from "../../lib/api";
import { useAppBranding } from "../../lib/branding-context";
import { clearSession } from "../../lib/session";
import { cn } from "../../lib/utils";
import { filterNavItems, isNavItemActive } from "./sidebar-nav";
import { getSidebarPanelClasses } from "./shell-policy";

type AppSidebarProps = {
  isMobileOpen?: boolean;
  isSidebarAccessible?: boolean;
  onNavigate?: () => void;
};

export function AppSidebar({ isMobileOpen = false, isSidebarAccessible = true, onNavigate }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { branding, acl, theme } = useAppBranding();
  const items = filterNavItems(acl.permissions);

  return (
    <aside
      id="app-sidebar"
      aria-label="Main navigation"
      aria-hidden={!isSidebarAccessible ? true : undefined}
      className={cn(
        "flex w-60 flex-col text-white",
        "fixed inset-y-0 left-0 z-50 transform transition-transform duration-200 ease-in-out md:static md:translate-x-0",
        getSidebarPanelClasses(isMobileOpen),
        !isMobileOpen && "pointer-events-none md:pointer-events-auto",
      )}
      style={{ background: theme.colors.primaryDark }}
    >
      <div className="px-5 py-6">
        <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">SchoolOS</p>
        <p className="mt-2 font-display text-lg font-semibold leading-tight">{branding.schoolName}</p>
        <p className="mt-1 text-xs text-accent">{branding.tagline}</p>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isNavItemActive(item.href, pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => onNavigate?.()}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
                active ? "bg-white/15" : "text-white/80 hover:bg-white/10",
              )}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <button
        className="m-4 flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white/70 hover:bg-white/10"
        onClick={() => {
          void (async () => {
            try {
              await api().auth.logout();
            } catch {
              /* revoke best-effort */
            }
            clearSession();
            router.replace("/login");
          })();
        }}
      >
        <LogOut size={16} />
        Logout
      </button>
    </aside>
  );
}
