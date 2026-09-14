import { useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useRouter } from "expo-router";
import { useBranding } from "../features/branding/branding-provider";
import { loadTenantBranding } from "../features/tenant/load-tenant-branding";
import { brandingMatchesSlug, isSlugPresent, normalizeSlug } from "../features/tenant/tenant-policy";
import { setSlug } from "../services/storage";
import { AppText } from "../components/ui/AppText";
import { AppInput } from "../components/ui/AppInput";
import { AppButton } from "../components/ui/AppButton";

const DEFAULT_SLUG_HINT = process.env.EXPO_PUBLIC_DEFAULT_SLUG ?? "arulneri";

export default function SchoolSelect() {
  const router = useRouter();
  const { theme, setBranding, branding } = useBranding();
  const [slugInput, setSlugInput] = useState(DEFAULT_SLUG_HINT);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function continueToSchool() {
    const slug = normalizeSlug(slugInput);
    if (!isSlugPresent(slug)) {
      setError("Enter your school code");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const tenantBranding = await loadTenantBranding(slug);
      if (!brandingMatchesSlug(tenantBranding, slug)) {
        setError("School unavailable");
        return;
      }
      await setSlug(slug);
      setBranding(tenantBranding);
      router.replace("/role-select");
    } catch {
      setError("School unavailable");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 justify-center px-6" style={{ backgroundColor: theme.colors.background }}>
      <AppText variant="display" color={theme.colors.primary}>
        SchoolOS
      </AppText>
      <AppText variant="body" style={{ marginTop: 8 }}>
        Enter your school code to continue
      </AppText>
      <AppText variant="caption" style={{ marginTop: 4 }}>
        Your administrator can share this code (tenant slug).
      </AppText>
      <AppInput
        className="mt-6"
        placeholder="School code"
        value={slugInput}
        onChangeText={setSlugInput}
        autoCapitalize="none"
        autoCorrect={false}
        editable={!loading}
      />
      {error ? (
        <AppText variant="caption" color={theme.colors.danger} style={{ marginTop: 8 }}>
          {error}
        </AppText>
      ) : null}
      {branding && !loading ? (
        <View className="mt-4 rounded-2xl bg-white p-4">
          <AppText variant="label" color={theme.colors.primary}>
            {branding.schoolName}
          </AppText>
          {branding.tagline ? (
            <AppText variant="caption" style={{ marginTop: 4 }}>
              {branding.tagline}
            </AppText>
          ) : null}
        </View>
      ) : null}
      <View className="mt-5">
        <AppButton
          label={loading ? "Loading school…" : "Continue"}
          loading={loading}
          onPress={() => void continueToSchool()}
        />
      </View>
      {loading ? <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 16 }} /> : null}
    </View>
  );
}
