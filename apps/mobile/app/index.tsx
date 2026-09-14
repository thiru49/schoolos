import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useRouter } from "expo-router";
import { api } from "../services/api";
import { getAccess, getActiveRole, getStoredSlug } from "../services/storage";
import { registerPushToken } from "../services/push";
import { useBranding } from "../features/branding/branding-provider";
import { loadTenantBranding } from "../features/tenant/load-tenant-branding";
import {
  brandingMatchesSlug,
  shouldPromptSchoolSelection,
  tenantSessionMatches,
} from "../features/tenant/tenant-policy";
import { clearAuthSession } from "../features/tenant/tenant-session";
import { AppText } from "../components/ui/AppText";
import { AppButton } from "../components/ui/AppButton";

export default function Splash() {
  const router = useRouter();
  const { setBranding, theme, branding, setAcl, setActiveRole, setSelectedChild } = useBranding();
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const storedSlug = await getStoredSlug();
      if (shouldPromptSchoolSelection(storedSlug)) {
        router.replace("/school-select");
        return;
      }

      const slug = storedSlug!;
      const tenantBranding = await loadTenantBranding(slug);
      if (!brandingMatchesSlug(tenantBranding, slug)) {
        setError("School unavailable");
        return;
      }
      setBranding(tenantBranding);

      const token = await getAccess();
      if (token) {
        try {
          const client = await api();
          const aclRes = await client.me.acl();
          if (!tenantSessionMatches(tenantBranding, aclRes)) {
            await clearAuthSession({ setAcl, setActiveRole, setSelectedChild });
            router.replace("/role-select");
            return;
          }
          setAcl(aclRes);
          const savedRole = await getActiveRole();
          if (savedRole && aclRes.roles.includes(savedRole)) {
            setActiveRole(savedRole);
          } else if (aclRes.roles.length === 1) {
            setActiveRole(aclRes.roles[0]);
          }
          void registerPushToken();
          router.replace("/(tabs)/home");
          return;
        } catch {
          await clearAuthSession({ setAcl, setActiveRole, setSelectedChild });
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
