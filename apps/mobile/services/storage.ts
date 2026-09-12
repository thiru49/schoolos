import * as SecureStore from "expo-secure-store";

const ACCESS = "access";
const REFRESH = "refresh";
const SLUG = "slug";

export async function getAccess() {
  return SecureStore.getItemAsync(ACCESS);
}
export async function setTokens(access: string, refresh: string) {
  await SecureStore.setItemAsync(ACCESS, access);
  await SecureStore.setItemAsync(REFRESH, refresh);
}
export async function clearTokens() {
  await SecureStore.deleteItemAsync(ACCESS);
  await SecureStore.deleteItemAsync(REFRESH);
}
export async function getSlug() {
  return (await SecureStore.getItemAsync(SLUG)) ?? process.env.EXPO_PUBLIC_DEFAULT_SLUG ?? "arulneri";
}
export async function setSlug(slug: string) {
  await SecureStore.setItemAsync(SLUG, slug);
}
