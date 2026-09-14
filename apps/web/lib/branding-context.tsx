// @ts-nocheck
"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { AclPayload, BrandingPayload } from "@schoolos/types";
import { createTheme, type ResolvedTheme } from "@schoolos/ui";
import { applyBrandingToDocument } from "./apply-branding";

type Ctx = {
  branding: BrandingPayload;
  acl: AclPayload;
  theme: ResolvedTheme;
  applyBranding: (next: BrandingPayload) => void;
};

const BrandingContext = createContext<Ctx | null>(null);

export function BrandingContextProvider({
  branding: initialBranding,
  acl,
  children,
}: {
  branding: BrandingPayload;
  acl: AclPayload;
  children: ReactNode;
}) {
  const [branding, setBranding] = useState(initialBranding);
  const theme = useMemo(() => createTheme(branding), [branding]);

  const applyBranding = useCallback((next: BrandingPayload) => {
    setBranding(next);
    applyBrandingToDocument(next);
  }, []);

  const value = useMemo(
    () => ({ branding, acl, theme, applyBranding }),
    [branding, acl, theme, applyBranding],
  );

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useAppBranding() {
  const ctx = useContext(BrandingContext);
  if (!ctx) throw new Error("BrandingContext missing");
  return ctx;
}
