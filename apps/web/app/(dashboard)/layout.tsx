"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createTheme } from "@schoolos/ui";
import type { AclPayload, BrandingPayload } from "@schoolos/types";
import { api } from "../../lib/api";
import { BrandingContextProvider } from "../../lib/branding-context";
import { clearSession, getAccessToken, getSlug } from "../../lib/session";
import { AppSidebar } from "../../components/shell/app-sidebar";
import { Skeleton } from "../../components/ui/skeleton";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [acl, setAcl] = useState<AclPayload | null>(null);
  const [branding, setBranding] = useState<BrandingPayload | null>(null);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    const client = api();
    Promise.all([client.me.acl(), client.branding.get(getSlug())])
      .then(([a, b]) => {
        setAcl(a);
        setBranding(b);
        const theme = createTheme(b);
        for (const [k, v] of Object.entries(theme.cssVars)) {
          document.documentElement.style.setProperty(k, v);
        }
      })
      .catch(() => {
        clearSession();
        router.replace("/login");
      });
  }, [router]);

  if (!acl || !branding) {
    return (
      <div className="flex min-h-screen">
        <Skeleton className="h-screen w-60 rounded-none" />
        <div className="flex-1 p-8">
          <Skeleton className="h-10 w-48" />
        </div>
      </div>
    );
  }

  return (
    <BrandingContextProvider branding={branding} acl={acl}>
      <div className="flex min-h-screen bg-canvas">
        <AppSidebar />
        <main className="flex-1 p-8">{children}</main>
      </div>
    </BrandingContextProvider>
  );
}
