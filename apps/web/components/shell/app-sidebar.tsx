"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarCheck,
  LayoutDashboard,
  LogOut,
  Settings,
} from "lucide-react";
import { PERMISSIONS } from "@schoolos/permissions";
import { useAppBranding } from "../../lib/branding-context";
import { clearSession } from "../../lib/session";
import { cn } from "../../lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, permission: null },
  { href: "/attendance", label: "Attendance", icon: CalendarCheck, permission: PERMISSIONS.ATTENDANCE_READ },
  { href: "/settings", label: "Settings", icon: Settings, permission: PERMISSIONS.SCHOOL_SETTINGS_READ },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { branding, acl, theme } = useAppBranding();
  const items = NAV.filter((i) => !i.permission || acl.permissions.includes(i.permission));

  return (
    <aside className="flex w-60 flex-col text-white" style={{ background: theme.colors.primaryDark }}>
      <div className="px-5 py-6">
        <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">SchoolOS</p>
        <p className="mt-2 font-display text-lg font-semibold leading-tight">{branding.schoolName}</p>
        <p className="mt-1 text-xs text-accent">{branding.tagline}</p>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
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
          clearSession();
          router.replace("/login");
        }}
      >
        <LogOut size={16} />
        Logout
      </button>
    </aside>
  );
}
