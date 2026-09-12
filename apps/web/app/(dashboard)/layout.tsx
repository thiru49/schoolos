"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PERMISSIONS } from "@schoolos/permissions";
import type { AclPayload, BrandingPayload } from "@schoolos/types";
import { createTheme } from "@schoolos/ui";
import { api } from "../../lib/api";
import { clearSession, getAccessToken } from "../../lib/session";

const NAV = [
  { href: "/dashboard", label: "Dashboard", permission: null },
  { href: "/attendance", label: "Attendance", permission: PERMISSIONS.ATTENDANCE_READ },
  { href: "/settings", label: "Settings", permission: PERMISSIONS.SCHOOL_SETTINGS_READ },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [acl, setAcl] = useState<AclPayload | null>(null);
  const [branding, setBranding] = useState<BrandingPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    const client = api();
    Promise.all([client.me.acl(), client.branding.get(process.env.NEXT_PUBLIC_DEFAULT_SLUG ?? "arulneri")])
      .then(([a, b]) => {
        setAcl(a);
        setBranding(b);
        const theme = createTheme(b);
        const root = document.documentElement;
        for (const [k, v] of Object.entries(theme.cssVars)) root.style.setProperty(k, v);
      })
      .catch((e: Error) => {
        setError(e.message);
        clearSession();
        router.replace("/login");
      });
  }, [router]);

  if (!acl || !branding) {
    return <div className="p-8 text-slate-500">{error ?? "Loading…"}</div>;
  }

  const items = NAV.filter((i) => !i.permission || acl.permissions.includes(i.permission));
  const theme = createTheme(branding);

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 p-4 text-white" style={{ background: theme.colors.primaryDark }}>
        <p className="text-xs uppercase tracking-wide text-white/70">SchoolOS</p>
        <p className="mt-1 font-display text-lg font-semibold">{branding.schoolName}</p>
        <nav className="mt-8 space-y-1">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-3 py-2 text-sm ${pathname === item.href ? "bg-white/15" : "hover:bg-white/10"}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <button
          className="mt-10 text-sm text-white/70"
          onClick={() => {
            clearSession();
            router.replace("/login");
          }}
        >
          Logout
        </button>
      </aside>
      <div className="flex-1 p-8">{children}</div>
    </div>
  );
}
