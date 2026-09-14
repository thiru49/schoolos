export type KeyValueStorage = {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
};

declare const require: { (id: string): KeyValueStorage };

export function createSecureStoreBackend(): KeyValueStorage | null {
  try {
    return require("expo-secure-store");
  } catch {
    return null;
  }
}
