// @ts-nocheck
"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { AclPayload, BrandingPayload } from "@schoolos/types";
import { createTheme, type ResolvedTheme } from "@schoolos/ui";

type Ctx = {
  branding: BrandingPayload;
  acl: AclPayload;
  theme: ResolvedTheme;
};

const BrandingContext = createContext<Ctx | null>(null);

export function BrandingContextProvider({
  branding,
  acl,
  children,
}: {
  branding: BrandingPayload;
  acl: AclPayload;
  children: ReactNode;
}) {
  const theme = createTheme(branding);
  return (
    <BrandingContext.Provider value={{ branding, acl, theme }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useAppBranding() {
  const ctx = useContext(BrandingContext);
  if (!ctx) throw new Error("BrandingContext missing");
  return ctx;
}
