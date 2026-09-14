"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@schoolos/api-client";
import { applyBrandingToDocument } from "../../lib/apply-branding";
import type { AclPayload, BrandingPayload } from "@schoolos/types";
import { api } from "../../lib/api";
import { BrandingContextProvider } from "../../lib/branding-context";
import { clearSession, getAccessToken, getSlug } from "../../lib/session";
import { AppSidebar } from "../../components/shell/app-sidebar";
import { PageErrorBoundary } from "../../components/states/page-error-boundary";
import { ErrorState } from "../../components/states/error-state";
import { Skeleton } from "../../components/ui/skeleton";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [acl, setAcl] = useState<AclPayload | null>(null);
  const [branding, setBranding] = useState<BrandingPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    const client = api();
    setLoadError(null);
    Promise.all([client.me.acl(), client.branding.get(getSlug())])
      .then(([a, b]) => {
        setAcl(a);
        setBranding(b);
        applyBrandingToDocument(b);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          clearSession();
          router.replace("/login");
          return;
        }
        setLoadError(err instanceof Error ? err.message : "Could not load session");
      });
  }, [router, reloadKey]);

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <ErrorState
          message={loadError}
          onRetry={() => {
            setAcl(null);
            setBranding(null);
            setReloadKey((k) => k + 1);
          }}
        />
      </div>
    );
  }

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
        <main className="flex-1 p-8">
          {React.createElement(PageErrorBoundary, null, children)}
        </main>
      </div>
    </BrandingContextProvider>
  );
}
