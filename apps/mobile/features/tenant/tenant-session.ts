import type { AclPayload, BrandingPayload, LinkedChild, RoleCode } from "@schoolos/types";
import { clearActiveRole, clearSlug, clearTokens } from "../../services/storage";

type SessionSetters = {
  setBranding: (branding: BrandingPayload | null) => void;
  setAcl: (acl: AclPayload | null) => void;
  setActiveRole: (role: RoleCode | null) => void;
  setSelectedChild?: (child: LinkedChild | null) => void;
};

/** Clears auth tokens and in-memory session without changing the selected school. */
export async function clearAuthSession({
  setAcl,
  setActiveRole,
  setSelectedChild,
}: Pick<SessionSetters, "setAcl" | "setActiveRole" | "setSelectedChild">) {
  await clearTokens();
  await clearActiveRole();
  setAcl(null);
  setActiveRole(null);
  setSelectedChild?.(null);
}

/** Clears school selection and auth so the user can pick a different tenant safely. */
export async function clearTenantSelection({
  setBranding,
  setAcl,
  setActiveRole,
  setSelectedChild,
}: SessionSetters) {
  await clearSlug();
  await clearTokens();
  await clearActiveRole();
  setBranding(null);
  setAcl(null);
  setActiveRole(null);
  setSelectedChild?.(null);
}
