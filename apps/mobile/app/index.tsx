import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useRouter } from "expo-router";
import { api } from "../services/api";
import { getAccess, getSlug } from "../services/storage";
import { useBranding } from "../features/branding/branding-provider";
import { AppText } from "../components/ui/AppText";
import { AppButton } from "../components/ui/AppButton";

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
          setAcl(await client.me.acl());
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
    <View className="flex-1 items-center justify-center px-8" style={{ backgroundColor: theme.colors.primaryDark }}>
      <AppText variant="display" color="white">
        {branding?.schoolName ?? "SchoolOS"}
      </AppText>
      <AppText variant="body" color={theme.colors.accent} style={{ marginTop: 8 }}>
        {branding?.tagline ?? ""}
      </AppText>
      <AppText variant="caption" color="white" style={{ marginTop: 24, opacity: 0.7 }}>
        {branding?.location ?? ""}
      </AppText>
      {error ? (
        <View className="mt-8 w-full">
          <AppButton label={`${error} — Retry`} onPress={() => void load()} />
        </View>
      ) : (
        <ActivityIndicator color="white" style={{ marginTop: 24 }} />
      )}
    </View>
  );
}
