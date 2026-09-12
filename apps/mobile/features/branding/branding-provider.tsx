import type { AclPayload, BrandingPayload, LinkedChild } from "@schoolos/types";
import { createTheme, type ResolvedTheme } from "@schoolos/ui";
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

type Ctx = {
  branding: BrandingPayload | null;
  theme: ResolvedTheme;
  acl: AclPayload | null;
  selectedChild: LinkedChild | null;
  setBranding: (b: BrandingPayload | null) => void;
  setAcl: (a: AclPayload | null) => void;
  setSelectedChild: Dispatch<SetStateAction<LinkedChild | null>>;
};

const BrandingContext = createContext<Ctx | null>(null);

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<BrandingPayload | null>(null);
  const [acl, setAcl] = useState<AclPayload | null>(null);
  const [selectedChild, setSelectedChild] = useState<LinkedChild | null>(null);
  const theme = useMemo(() => createTheme(branding), [branding]);
  return (
    <BrandingContext.Provider
      value={{ branding, theme, acl, selectedChild, setBranding, setAcl, setSelectedChild }}
    >
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const ctx = useContext(BrandingContext);
  if (!ctx) throw new Error("BrandingProvider missing");
  return ctx;
}
