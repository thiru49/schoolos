import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, View } from "react-native";
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

const FOOTER_CREDIT = "Developed by SchoolOS Team";

export default function Splash() {
  const router = useRouter();
  const { setBranding, theme, branding, setAcl, setActiveRole, setSelectedChild } =
    useBranding();
  const [error, setError] = useState<string | null>(null);
  const progress = useRef(new Animated.Value(0.18)).current;

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

  useEffect(() => {
    if (error) {
      progress.stopAnimation();
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 0.85,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(progress, {
          toValue: 0.28,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [error, progress]);

  const schoolName = branding?.schoolName ?? "SchoolOS";
  const location = branding?.location ?? "";
  const tagline = branding?.tagline ?? "";
  const primary = theme.colors.primary || "#0B3A6E";
  const accent = theme.colors.accent || "#E8A317";
  const initials = schoolName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
  const barWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View className="flex-1 bg-white">
      {/* Soft corner accents from tenant theme */}
      <View
        pointerEvents="none"
        className="absolute rounded-full"
        style={{
          width: 280,
          height: 280,
          top: -120,
          left: -100,
          backgroundColor: `${primary}22`,
        }}
      />
      <View
        pointerEvents="none"
        className="absolute rounded-full"
        style={{
          width: 300,
          height: 300,
          bottom: -140,
          right: -110,
          backgroundColor: `${accent}28`,
        }}
      />

      <View className="flex-1 items-center justify-between px-8 py-14">
        <View />

        <View className="items-center w-full max-w-sm">
          <View
            className="w-24 h-24 rounded-3xl items-center justify-center mb-5"
            style={{ backgroundColor: `${primary}12` }}
          >
            {branding?.logoUrl ? (
              <Image
                source={{ uri: branding.logoUrl }}
                style={{ width: 78, height: 78 }}
                resizeMode="contain"
              />
            ) : (
              <View
                className="w-16 h-16 rounded-2xl items-center justify-center"
                style={{ backgroundColor: primary }}
              >
                <AppText
                  variant="display"
                  color={accent}
                  style={{ fontSize: 26, fontWeight: "800", letterSpacing: 1 }}
                >
                  {initials || "SO"}
                </AppText>
              </View>
            )}
          </View>

          <AppText
            variant="display"
            color={primary}
            style={{
              fontSize: 26,
              fontWeight: "800",
              textAlign: "center",
              letterSpacing: 0.5,
              textTransform: "uppercase",
            }}
          >
            {schoolName}
          </AppText>

          {location ? (
            <AppText
              variant="caption"
              style={{
                marginTop: 10,
                color: "#94A3B8",
                textAlign: "center",
                fontSize: 13,
              }}
            >
              {location.replace(/ · /g, ", ")}
            </AppText>
          ) : null}

          {tagline ? (
            <AppText
              variant="body"
              color={accent}
              style={{
                marginTop: 10,
                textAlign: "center",
                fontWeight: "700",
                fontSize: 15,
              }}
            >
              {tagline.replace(/ · /g, " • ")}
            </AppText>
          ) : null}

          {error ? (
            <View className="mt-10 w-full">
              <AppText
                variant="caption"
                color={theme.colors.danger}
                style={{ textAlign: "center", marginBottom: 12, fontWeight: "600" }}
              >
                {error}
              </AppText>
              <AppButton
                label="Retry Connection"
                variant="secondary"
                onPress={() => void load()}
              />
              <ChangeSchoolLink />
            </View>
          ) : (
            <View
              className="mt-12 h-2 w-44 overflow-hidden rounded-full"
              style={{ backgroundColor: `${primary}18` }}
            >
              <Animated.View
                style={{
                  height: "100%",
                  width: barWidth,
                  borderRadius: 999,
                  backgroundColor: primary,
                }}
              />
            </View>
          )}
        </View>

        <AppText
          variant="caption"
          style={{ color: "#94A3B8", fontSize: 12, textAlign: "center" }}
        >
          {branding?.poweredBy?.trim() || FOOTER_CREDIT}
        </AppText>
      </View>
    </View>
  );
}
