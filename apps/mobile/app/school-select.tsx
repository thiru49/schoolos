import React, { useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { School, ArrowRight, Sparkles } from "lucide-react-native";
import { useBranding } from "../features/branding/branding-provider";
import { loadTenantBranding } from "../features/tenant/load-tenant-branding";
import {
  brandingMatchesSlug,
  isSlugPresent,
  normalizeSlug,
} from "../features/tenant/tenant-policy";
import { setSlug } from "../services/storage";
import {
  Screen,
  ScreenHeader,
  Card,
  AppInput,
  AppButton,
  Badge,
} from "../components/ui";
import { AppText } from "../components/ui/AppText";

const DEFAULT_SLUG_HINT = process.env.EXPO_PUBLIC_DEFAULT_SLUG ?? "arulneri";

export default function SchoolSelect() {
  const router = useRouter();
  const { theme, setBranding, branding } = useBranding();
  const [slugInput, setSlugInput] = useState(DEFAULT_SLUG_HINT);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function continueToSchool(targetSlug?: string) {
    const raw = targetSlug ?? slugInput;
    const slug = normalizeSlug(raw);
    if (!isSlugPresent(slug)) {
      setError("Please enter your school code");
      return;
    }

    Keyboard.dismiss();
    setLoading(true);
    setError(null);
    try {
      const tenantBranding = await loadTenantBranding(slug);
      if (!brandingMatchesSlug(tenantBranding, slug)) {
        setError("School code is invalid or unavailable.");
        return;
      }
      await setSlug(slug);
      setBranding(tenantBranding);
      router.replace("/role-select");
    } catch (err) {
      console.error("Failed to load school branding:", err);
      setError("Could not reach school server. Check connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen scrollable={true}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <View className="px-6 pt-10 pb-8">
          {/* Header */}
          <View className="mb-6">
            <View className="flex-row items-center gap-x-2 mb-2">
              <View
                className="w-10 h-10 rounded-2xl items-center justify-center shadow-sm"
                style={{ backgroundColor: `${theme.colors.primary}18` }}
              >
                <School size={22} color={theme.colors.primary} />
              </View>
              <Badge label="SchoolOS" variant="info" />
            </View>

            <AppText
              variant="display"
              color={theme.colors.primary}
              style={{ fontSize: 28, fontWeight: "800" }}
            >
              Select Your School
            </AppText>
            <AppText
              variant="body"
              style={{ marginTop: 6, color: "#475569", fontSize: 15 }}
            >
              Enter the unique school code provided by your administration.
            </AppText>
          </View>

          {/* School Code Input Form */}
          <Card variant="elevated" style={{ marginBottom: 20 }}>
            <View className="gap-y-3">
              <AppInput
                label="School Code (Slug)"
                placeholder="e.g. arulneri"
                value={slugInput}
                onChangeText={(text) => {
                  setSlugInput(text);
                  if (error) setError(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="go"
                onSubmitEditing={() => void continueToSchool()}
                editable={!loading}
              />

              {error ? (
                <View className="p-3 bg-red-50 border border-red-200 rounded-xl">
                  <AppText variant="caption" color={theme.colors.danger} style={{ fontWeight: "600" }}>
                    {error}
                  </AppText>
                </View>
              ) : null}

              <AppButton
                label={loading ? "Verifying school…" : "Continue"}
                loading={loading}
                variant="primary"
                onPress={() => void continueToSchool()}
                rightIcon={<ArrowRight size={18} color="white" />}
              />
            </View>
          </Card>

          {/* Featured Demo School Card */}
          <View className="mb-4">
            <AppText
              variant="label"
              style={{ color: "#64748B", marginBottom: 8, textTransform: "uppercase", fontSize: 12, letterSpacing: 1 }}
            >
              Demo School Instance
            </AppText>

            <Pressable
              onPress={() => {
                setSlugInput("arulneri");
                if (error) setError(null);
                void continueToSchool("arulneri");
              }}
            >
              <Card variant="outlined" style={{ backgroundColor: "#F8FAFC", borderColor: "#CBD5E1" }}>
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 pr-3">
                    <View className="flex-row items-center gap-x-2 mb-1">
                      <AppText variant="title" color={theme.colors.primary} style={{ fontSize: 16, fontWeight: "700" }}>
                        Arul Neri Academy
                      </AppText>
                      <Badge label="Active Demo" variant="success" />
                    </View>
                    <AppText variant="caption" style={{ color: "#64748B" }}>
                      Learn with purpose • Tamil Nadu (code: arulneri)
                    </AppText>
                  </View>

                  <View
                    className="w-9 h-9 rounded-full items-center justify-center"
                    style={{ backgroundColor: `${theme.colors.primary}12` }}
                  >
                    <Sparkles size={18} color={theme.colors.primary} />
                  </View>
                </View>
              </Card>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
