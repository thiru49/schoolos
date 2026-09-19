import React, { useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Lock, User, Eye, EyeOff, LogIn } from "lucide-react-native";
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
import {
  Screen,
  ScreenHeader,
  Card,
  AppInput,
  AppButton,
  Badge,
} from "../components/ui";
import { AppText } from "../components/ui/AppText";
import { ChangeSchoolLink } from "../components/ui/ChangeSchoolLink";

const ROLE_PRESETS: Partial<Record<RoleCode, { identifier: string; label: string }>> = {
  teacher: { identifier: "TCH-8A", label: "Teacher" },
  parent: { identifier: "9000000001", label: "Parent" },
  student: { identifier: "AN2021-0001", label: "Student" },
  school_super_admin: { identifier: "admin", label: "Admin" },
  academic_admin: { identifier: "academic", label: "Academic Admin" },
  accounts_admin: { identifier: "accounts", label: "Accounts Admin" },
};

export default function Login() {
  const { role: initialRole } = useLocalSearchParams<{ role?: RoleCode }>();
  const router = useRouter();
  const { branding, theme, setAcl, setActiveRole } = useBranding();

  const [selectedRole, setSelectedRole] = useState<RoleCode>(
    initialRole && ROLE_PRESETS[initialRole] ? initialRole : "teacher",
  );
  const [identifier, setIdentifier] = useState(
    ROLE_PRESETS[selectedRole]?.identifier ?? "TCH-8A",
  );
  const [password, setPassword] = useState("Password123!");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit =
    identifier.trim().length > 0 && password.trim().length > 0 && !loading;

  function handleRoleChange(newRole: RoleCode) {
    setSelectedRole(newRole);
    setIdentifier(ROLE_PRESETS[newRole]?.identifier ?? "");
    setError(null);
  }

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
        roleHint: selectedRole,
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
        setError("This account does not belong to the selected school.");
        return;
      }

      setAcl(aclRes);

      // Resolve active role
      if (selectedRole && aclRes.roles.includes(selectedRole)) {
        await persistActiveRole(selectedRole);
        setActiveRole(selectedRole);
      } else if (aclRes.roles.length === 1) {
        await persistActiveRole(aclRes.roles[0]);
        setActiveRole(aclRes.roles[0]);
      } else if (aclRes.roles.length > 1) {
        // Multi-role user without exact matching role -> send to role-select
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
    <Screen scrollable={true}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <View className="px-6 pt-10 pb-8">
          {/* Header */}
          <View className="mb-6">
            <Badge
              label={branding?.schoolName ?? "SchoolOS"}
              variant="neutral"
              style={{ alignSelf: "flex-start", marginBottom: 8 }}
            />
            <AppText
              variant="display"
              color={theme.colors.primary}
              style={{ fontSize: 28, fontWeight: "800" }}
            >
              Sign In
            </AppText>
            <AppText
              variant="body"
              style={{ marginTop: 6, color: "#475569", fontSize: 15 }}
            >
              Enter your credentials to access your portal.
            </AppText>
          </View>

          {/* Role Switching Pills */}
          <View className="mb-5">
            <AppText
              variant="caption"
              style={{ color: "#64748B", marginBottom: 8, fontWeight: "600", textTransform: "uppercase", fontSize: 11 }}
            >
              Signing in as:
            </AppText>
            <View className="flex-row gap-x-2">
              {(["teacher", "parent", "student"] as RoleCode[]).map((r) => {
                const isSelected = selectedRole === r;
                return (
                  <Pressable
                    key={r}
                    onPress={() => handleRoleChange(r)}
                    className="flex-1 py-2 rounded-xl items-center border"
                    style={{
                      backgroundColor: isSelected ? theme.colors.primary : "#F8FAFC",
                      borderColor: isSelected ? theme.colors.primary : "#E2E8F0",
                    }}
                  >
                    <AppText
                      variant="caption"
                      style={{
                        fontWeight: "700",
                        color: isSelected ? "white" : "#475569",
                        textTransform: "capitalize",
                      }}
                    >
                      {r}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Form Card */}
          <Card variant="elevated" style={{ marginBottom: 16 }}>
            <View className="gap-y-4">
              <AppInput
                label="Admission / Employee ID"
                placeholder="Enter ID or mobile number"
                value={identifier}
                onChangeText={(t) => {
                  setIdentifier(t);
                  if (error) setError(null);
                }}
                autoCapitalize="none"
                returnKeyType="next"
                leftIcon={<User size={18} color="#94A3B8" />}
              />

              <View>
                <AppInput
                  label="Password"
                  placeholder="Enter password"
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    if (error) setError(null);
                  }}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
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
              </View>

              {error ? (
                <View className="p-3 bg-red-50 border border-red-200 rounded-xl">
                  <AppText
                    variant="caption"
                    color={theme.colors.danger}
                    style={{ fontWeight: "600" }}
                  >
                    {error}
                  </AppText>
                </View>
              ) : null}

              <AppButton
                label={loading ? "Signing in…" : "Sign In"}
                loading={loading}
                disabled={!canSubmit}
                variant="primary"
                onPress={() => void submit()}
                rightIcon={<LogIn size={18} color="white" />}
              />
            </View>
          </Card>

          <ChangeSchoolLink />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
