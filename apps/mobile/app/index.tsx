import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useRouter } from "expo-router";
import * as Font from "expo-font";
import { api } from "../services/api";
import { getAccess, getSlug } from "../services/storage";
import { registerPushToken } from "../services/push";
import { useBranding } from "../features/branding/branding-provider";
import { AppText } from "../components/ui/AppText";
import { AppButton } from "../components/ui/AppButton";

const TAMIL_FONT =
  "https://fonts.gstatic.com/s/notosanstamil/v27/ieVc2YdFI3GCY6SyQy1KfStzYKZgzN1z4VKFvNBh8ZKb1nc.ttf";

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
      try {
        await Font.loadAsync({ "Noto Sans Tamil": { uri: TAMIL_FONT } });
      } catch {
        // Fallback is handled by AppText if the remote font cannot load.
      }
      const token = await getAccess();
      if (token) {
        try {
          setAcl(await client.me.acl());
          void registerPushToken();
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
