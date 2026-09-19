import { useEffect, useState } from "react";
import { ActivityIndicator, View, Image } from "react-native";
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
import {
  buildSessionCacheContext,
  clearAuthSession,
} from "../features/tenant/tenant-session";
import { AppText } from "../components/ui/AppText";
import { AppButton } from "../components/ui/AppButton";
import { ChangeSchoolLink } from "../components/ui/ChangeSchoolLink";

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
            await clearAuthSession({
              setAcl,
              setActiveRole,
              setSelectedChild,
              cacheContext: buildSessionCacheContext(aclRes, null),
            });
            router.replace("/role-select");
            return;
          }
          setAcl(aclRes);
          const savedRole = await getActiveRole();
          if (savedRole && aclRes.roles.includes(savedRole)) {
            setActiveRole(savedRole);
            void registerPushToken();
            router.replace("/(tabs)/home");
            return;
          } else if (aclRes.roles.length === 1) {
            setActiveRole(aclRes.roles[0]);
            void registerPushToken();
            router.replace("/(tabs)/home");
            return;
          } else if (aclRes.roles.length > 1) {
            // Multi-role user needs to choose an active role
            router.replace("/role-select");
            return;
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

  const schoolName = branding?.schoolName ?? "SchoolOS";
  const initials = schoolName
    .split(" ")
    .filter(Boolean)
    .slice(0, 3)
    .map((w) => w[0].toUpperCase())
    .join("");

  return (
    <View
      className="flex-1 items-center justify-between px-8 py-16"
      style={{ backgroundColor: theme.colors.primaryDark }}
    >
      <View />

      {/* Center Branding Content */}
      <View className="items-center">
        {/* Monogram / Crest */}
        <View
          className="w-24 h-24 rounded-3xl items-center justify-center mb-6 shadow-lg border"
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.12)",
            borderColor: theme.colors.accent || "#FBBF24",
          }}
        >
          {branding?.logoUrl ? (
            <Image
              source={{ uri: branding.logoUrl }}
              className="w-16 h-16 rounded-2xl"
              resizeMode="contain"
            />
          ) : (
            <AppText
              variant="display"
              color={theme.colors.accent || "#FBBF24"}
              style={{ fontSize: 32, fontWeight: "800", letterSpacing: 2 }}
            >
              {initials || "SOS"}
            </AppText>
          )}
        </View>

        <AppText
          variant="display"
          color="white"
          style={{ fontSize: 28, fontWeight: "700", textAlign: "center" }}
        >
          {schoolName}
        </AppText>

        {branding?.tagline ? (
          <AppText
            variant="body"
            color={theme.colors.accent || "#FBBF24"}
            style={{ marginTop: 8, textAlign: "center", fontWeight: "500" }}
          >
            {branding.tagline}
          </AppText>
        ) : null}

        {branding?.location ? (
          <AppText
            variant="caption"
            color="white"
            style={{ marginTop: 12, opacity: 0.75, textAlign: "center" }}
          >
            📍 {branding.location}
          </AppText>
        ) : null}

        {error ? (
          <View className="mt-8 w-full max-w-xs">
            <AppButton
              label="Retry Connection"
              variant="secondary"
              onPress={() => void load()}
            />
            <ChangeSchoolLink />
          </View>
        ) : (
          <ActivityIndicator color={theme.colors.accent || "white"} size="large" style={{ marginTop: 32 }} />
        )}
      </View>

      {/* Footer Branding */}
      <View className="items-center">
        <AppText variant="caption" color="white" style={{ opacity: 0.6, fontSize: 12 }}>
          {branding?.poweredBy ? `Powered by ${branding.poweredBy}` : "Powered by CREOVY"}
        </AppText>
      </View>
    </View>
  );
}
