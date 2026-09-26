import React, { useMemo, useState } from "react";
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Lock, User, Eye, EyeOff, LogIn, ChevronLeft } from "lucide-react-native";
import type { RoleCode } from "@schoolos/types";
import { api } from "../services/api";
import {
  clearActiveRole,
  clearTokens,
  getSlug,
  setActiveRole as persistActiveRole,
  setTokens,
} from "../services/storage";
import { registerPushToken } from "../services/push";
import { useBranding } from "../features/branding/branding-provider";
import { brandingMatchesSlug, tenantSessionMatches } from "../features/tenant/tenant-policy";
import { Card, AppInput, AppButton } from "../components/ui";
import { AppText } from "../components/ui/AppText";

const FOOTER_CREDIT = "Developed by SchoolOS Team";

const ROLE_COPY: Partial<
  Record<RoleCode, { label: string; ta: string; idLabel: string; idPlaceholder: string }>
> = {
  teacher: {
    label: "Teacher",
    ta: "ஆசிரியர்",
    idLabel: "Employee ID",
    idPlaceholder: "Enter employee ID",
  },
  parent: {
    label: "Parent",
    ta: "பெற்றோர்",
    idLabel: "Mobile number",
    idPlaceholder: "Enter registered mobile number",
  },
  student: {
    label: "Student",
    ta: "மாணவர்",
    idLabel: "Admission ID",
    idPlaceholder: "Enter admission ID",
  },
};

const ALLOWED_ROLES: RoleCode[] = ["teacher", "parent", "student"];

export default function Login() {
  const { role: roleParam } = useLocalSearchParams<{ role?: RoleCode }>();
  const router = useRouter();
  const { branding, theme, setAcl, setActiveRole } = useBranding();

  const role: RoleCode =
    roleParam && ALLOWED_ROLES.includes(roleParam) ? roleParam : "student";
  const roleCopy = ROLE_COPY[role] ?? ROLE_COPY.student!;

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit =
    identifier.trim().length > 0 && password.trim().length > 0 && !loading;

  const primary = theme.colors.primary || "#0B3A6E";
  const schoolName = branding?.schoolName ?? "SchoolOS";
  const schoolLocation = branding?.location?.trim() || "";
  const initials = useMemo(
    () =>
      schoolName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0].toUpperCase())
        .join(""),
    [schoolName],
  );

  async function submit() {
    if (!canSubmit) return;
    Keyboard.dismiss();
    setLoading(true);
    setError(null);
    try {
      const slug = await getSlug();
      const client = await api();
      const res = await client.auth.login({
        slug,
        roleHint: role,
        identifier: identifier.trim(),
        password,
      });

      await setTokens(res.accessToken, res.refreshToken);

      const aclRes = await (await api()).me.acl();
      if (
        branding &&
        (!brandingMatchesSlug(branding, slug) || !tenantSessionMatches(branding, aclRes))
      ) {
        await clearTokens();
        await clearActiveRole();
        setActiveRole(null);
        setError("This account does not belong to this school.");
        return;
      }

      setAcl(aclRes);

      if (aclRes.roles.includes(role)) {
        await persistActiveRole(role);
        setActiveRole(role);
      } else if (aclRes.roles.length === 1) {
        await persistActiveRole(aclRes.roles[0]);
        setActiveRole(aclRes.roles[0]);
      } else if (aclRes.roles.length > 1) {
        router.replace("/role-select");
        return;
      }

      void registerPushToken();
      router.replace("/(tabs)/home");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView
      edges={["top", "left", "right", "bottom"]}
      style={{ flex: 1, backgroundColor: theme.colors.background }}
    >
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 24,
            paddingTop: 16,
            paddingBottom: 20,
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            onPress={() => router.replace("/role-select")}
            className="mb-4 flex-row items-center gap-x-1 self-start py-1"
            hitSlop={8}
          >
            <ChevronLeft size={18} color={primary} />
            <AppText variant="caption" color={primary} style={{ fontWeight: "600" }}>
              Back to roles
            </AppText>
          </Pressable>

          <View className="mb-6 flex-row items-center gap-x-3">
            <View
              className="h-12 w-12 items-center justify-center rounded-2xl"
              style={{ backgroundColor: `${primary}14` }}
            >
              {branding?.logoUrl ? (
                <Image
                  source={{ uri: branding.logoUrl }}
                  style={{ width: 36, height: 36 }}
                  resizeMode="contain"
                />
              ) : (
                <AppText
                  variant="title"
                  color={primary}
                  style={{ fontSize: 16, fontWeight: "800" }}
                >
                  {initials || "SO"}
                </AppText>
              )}
            </View>
            <View className="flex-1">
              <AppText
                variant="title"
                color={primary}
                style={{ fontSize: 16, fontWeight: "800" }}
                numberOfLines={1}
              >
                {schoolName}
              </AppText>
              <AppText
                variant="caption"
                style={{ color: "#64748B", marginTop: 2, fontSize: 12 }}
              >
                {roleCopy.label} ({roleCopy.ta})
              </AppText>
            </View>
          </View>

          <View className="mb-5">
            <AppText
              variant="display"
              color={primary}
              style={{ fontSize: 28, fontWeight: "800" }}
            >
              Sign In
            </AppText>
            <AppText
              variant="body"
              style={{ marginTop: 6, color: "#64748B", fontSize: 15 }}
            >
              Enter your credentials, then tap Sign In below.
            </AppText>
          </View>

          <Card variant="elevated" style={{ marginBottom: 8 }}>
            <View className="gap-y-4">
              <AppInput
                label={roleCopy.idLabel}
                placeholder={roleCopy.idPlaceholder}
                value={identifier}
                onChangeText={(t) => {
                  setIdentifier(t);
                  if (error) setError(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                blurOnSubmit={false}
                leftIcon={<User size={18} color="#94A3B8" />}
              />

              <AppInput
                label="Password"
                placeholder="Enter password"
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  if (error) setError(null);
                }}
                secureTextEntry={!showPassword}
                returnKeyType="go"
                onSubmitEditing={() => {
                  if (canSubmit) void submit();
                }}
                leftIcon={<Lock size={18} color="#94A3B8" />}
                rightIcon={
                  <Pressable
                    onPress={() => setShowPassword((prev) => !prev)}
                    hitSlop={8}
                  >
                    {showPassword ? (
                      <EyeOff size={18} color="#94A3B8" />
                    ) : (
                      <Eye size={18} color="#94A3B8" />
                    )}
                  </Pressable>
                }
              />

              {error ? (
                <View className="rounded-xl border border-red-200 bg-red-50 p-3">
                  <AppText
                    variant="caption"
                    color={theme.colors.danger}
                    style={{ fontWeight: "600" }}
                  >
                    {error}
                  </AppText>
                </View>
              ) : null}
            </View>
          </Card>
        </ScrollView>

        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: "#E2E8F0",
            backgroundColor: theme.colors.background,
            paddingHorizontal: 24,
            paddingTop: 12,
            paddingBottom: 8,
          }}
        >
          <AppButton
            label={loading ? "Signing in..." : "Sign In"}
            loading={loading}
            disabled={!canSubmit}
            variant="primary"
            size="lg"
            onPress={() => void submit()}
            rightIcon={loading ? undefined : <LogIn size={18} color="white" />}
          />

          <View className="mt-3 items-center">
            <AppText
              variant="caption"
              style={{
                color: primary,
                fontSize: 12,
                fontWeight: "700",
                textAlign: "center",
              }}
              numberOfLines={1}
            >
              {schoolName}
            </AppText>
            {schoolLocation ? (
              <AppText
                variant="caption"
                style={{ color: "#94A3B8", fontSize: 11, textAlign: "center", marginTop: 1 }}
                numberOfLines={1}
              >
                {schoolLocation}
              </AppText>
            ) : null}
            <AppText
              variant="caption"
              style={{
                color: "#94A3B8",
                fontSize: 11,
                textAlign: "center",
                marginTop: 4,
              }}
            >
              {FOOTER_CREDIT}
            </AppText>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
