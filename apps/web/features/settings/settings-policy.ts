import { PERMISSIONS } from "@schoolos/permissions";

export interface SettingsAcl {
  permissions: readonly string[] | string[];
  scopes: readonly { type: string }[];
}

export function hasSchoolScope(acl: SettingsAcl): boolean {
  return acl.scopes.some((s) => s.type === "school");
}

export function canReadSettings(acl: SettingsAcl): boolean {
  return acl.permissions.includes(PERMISSIONS.SCHOOL_SETTINGS_READ) && hasSchoolScope(acl);
}

export function canUpdateSettings(acl: SettingsAcl): boolean {
  return acl.permissions.includes(PERMISSIONS.SCHOOL_SETTINGS_UPDATE) && hasSchoolScope(acl);
}

export function canUpdateBranding(acl: SettingsAcl): boolean {
  return acl.permissions.includes(PERMISSIONS.SCHOOL_BRANDING_UPDATE) && hasSchoolScope(acl);
}
