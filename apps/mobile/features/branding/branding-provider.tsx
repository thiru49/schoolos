import type { AclPayload, BrandingPayload, LinkedChild, RoleCode } from "@schoolos/types";
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
  activeRole: RoleCode | null;
  selectedChild: LinkedChild | null;
  setBranding: (b: BrandingPayload | null) => void;
  setAcl: (a: AclPayload | null) => void;
  setActiveRole: Dispatch<SetStateAction<RoleCode | null>>;
  setSelectedChild: Dispatch<SetStateAction<LinkedChild | null>>;
};

const BrandingContext = createContext<Ctx | null>(null);

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<BrandingPayload | null>(null);
  const [acl, setAcl] = useState<AclPayload | null>(null);
  const [activeRole, setActiveRole] = useState<RoleCode | null>(null);
  const [selectedChild, setSelectedChild] = useState<LinkedChild | null>(null);
  const theme = useMemo(() => createTheme(branding), [branding]);
  return (
    <BrandingContext.Provider
      value={{
        branding,
        theme,
        acl,
        activeRole,
        selectedChild,
        setBranding,
        setAcl,
        setActiveRole,
        setSelectedChild,
      }}
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
