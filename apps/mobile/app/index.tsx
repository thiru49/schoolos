import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { api } from "../services/api";
import { getAccess, getSlug } from "../services/storage";
import { useBranding } from "../features/branding/branding-provider";

export default function Splash() {
  const router = useRouter();
  const { setBranding, theme, branding, setAcl } = useBranding();
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const slug = await getSlug();
      const client = await api();
      const b = await client.branding.get(slug);
      setBranding(b);
      const token = await getAccess();
      if (token) {
        try {
          const acl = await client.me.acl();
          setAcl(acl);
          router.replace("/(tabs)/home");
          return;
        } catch {
          router.replace("/role-select");
          return;
        }
      }
      router.replace("/role-select");
    } catch {
      setError("School unavailable");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.primaryDark, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: "white", fontSize: theme.typography.scale.display, fontWeight: "700" }}>
        {branding?.schoolName ?? "SchoolOS"}
      </Text>
      <Text style={{ color: theme.colors.accent, marginTop: 8 }}>{branding?.tagline ?? ""}</Text>
      {error ? (
        <Pressable onPress={() => void load()} style={{ marginTop: 24 }}>
          <Text style={{ color: "white" }}>{error} — Retry</Text>
        </Pressable>
      ) : (
        <ActivityIndicator color="white" style={{ marginTop: 24 }} />
      )}
    </View>
  );
}
