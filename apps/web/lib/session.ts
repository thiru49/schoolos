import type { AclPayload, BrandingPayload } from "@schoolos/types";

const ACCESS = "schoolos.access";
const REFRESH = "schoolos.refresh";
const SLUG = "schoolos.slug";

export function getSlug() {
  if (typeof window === "undefined") return process.env.NEXT_PUBLIC_DEFAULT_SLUG ?? "arulneri";
  return localStorage.getItem(SLUG) ?? process.env.NEXT_PUBLIC_DEFAULT_SLUG ?? "arulneri";
}

export function setSlug(slug: string) {
  localStorage.setItem(SLUG, slug);
}

export function getAccessToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS);
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem(ACCESS, access);
  localStorage.setItem(REFRESH, refresh);
}

export function clearSession() {
  localStorage.removeItem(ACCESS);
  localStorage.removeItem(REFRESH);
}

export type CachedAuth = { acl: AclPayload; branding: BrandingPayload };
