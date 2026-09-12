import type { AclPayload, BrandingPayload } from "@schoolos/types";
import { createTheme, type ResolvedTheme } from "@schoolos/ui";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type Ctx = {
  branding: BrandingPayload | null;
  theme: ResolvedTheme;
  acl: AclPayload | null;
  setBranding: (b: BrandingPayload | null) => void;
  setAcl: (a: AclPayload | null) => void;
};

const BrandingContext = createContext<Ctx | null>(null);

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<BrandingPayload | null>(null);
  const [acl, setAcl] = useState<AclPayload | null>(null);
  const theme = useMemo(() => createTheme(branding), [branding]);
  return (
    <BrandingContext.Provider value={{ branding, theme, acl, setBranding, setAcl }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const ctx = useContext(BrandingContext);
  if (!ctx) throw new Error("BrandingProvider missing");
  return ctx;
}
