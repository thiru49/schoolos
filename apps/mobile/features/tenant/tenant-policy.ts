import type { AclPayload, BrandingPayload } from "@schoolos/types";

export function normalizeSlug(input: string): string {
  return input.trim().toLowerCase();
}

export function isSlugPresent(slug: string): boolean {
  return normalizeSlug(slug).length > 0;
}

/** True when the user has not explicitly chosen a school yet. */
export function shouldPromptSchoolSelection(storedSlug: string | null | undefined): boolean {
  return !storedSlug;
}

/** Ensures authenticated session belongs to the loaded tenant branding. */
export function tenantSessionMatches(branding: BrandingPayload, acl: AclPayload): boolean {
  return branding.tenantId === acl.schoolId;
}

/** Validates branding response matches the slug used to fetch it. */
export function brandingMatchesSlug(branding: BrandingPayload, slug: string): boolean {
  return branding.slug === normalizeSlug(slug);
}
