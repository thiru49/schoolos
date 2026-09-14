import * as SecureStore from "expo-secure-store";
import type { RoleCode } from "@schoolos/types";

const ACCESS = "access";
const REFRESH = "refresh";
const SLUG = "slug";
const ACTIVE_ROLE = "active_role";

export async function getAccess() {
  return SecureStore.getItemAsync(ACCESS);
}
export async function getRefresh() {
  return SecureStore.getItemAsync(REFRESH);
}
export async function setTokens(access: string, refresh: string) {
  await SecureStore.setItemAsync(ACCESS, access);
  await SecureStore.setItemAsync(REFRESH, refresh);
}
export async function clearTokens() {
  await SecureStore.deleteItemAsync(ACCESS);
  await SecureStore.deleteItemAsync(REFRESH);
}
export async function getStoredSlug() {
  return SecureStore.getItemAsync(SLUG);
}
export async function getSlug() {
  return (await getStoredSlug()) ?? process.env.EXPO_PUBLIC_DEFAULT_SLUG ?? "arulneri";
}
export async function setSlug(slug: string) {
  await SecureStore.setItemAsync(SLUG, slug);
}
export async function clearSlug() {
  await SecureStore.deleteItemAsync(SLUG);
}
export async function getActiveRole(): Promise<RoleCode | null> {
  const role = await SecureStore.getItemAsync(ACTIVE_ROLE);
  return (role as RoleCode) || null;
}
export async function setActiveRole(role: RoleCode): Promise<void> {
  await SecureStore.setItemAsync(ACTIVE_ROLE, role);
}
export async function clearActiveRole(): Promise<void> {
  await SecureStore.deleteItemAsync(ACTIVE_ROLE);
}
