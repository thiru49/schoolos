import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import {
  User,
  School,
  Shield,
  LogOut,
  RotateCw,
  Building,
  Check,
} from "lucide-react-native";
import { useBranding } from "../../features/branding/branding-provider";
import { api } from "../../services/api";
import { setActiveRole as persistActiveRole } from "../../services/storage";
import {
  buildSessionCacheContext,
  clearAuthSession,
  clearTenantSelection,
} from "../../features/tenant/tenant-session";
import {
  Screen,
  ScreenHeader,
  SectionHeader,
  Card,
  Avatar,
  Badge,
  AppButton,
  Divider,
  ModalSheet,
} from "../../components/ui";
import { AppText } from "../../components/ui/AppText";

export default function Profile() {
  const {
    theme,
    branding,
    acl,
    setAcl,
    activeRole,
    setActiveRole,
    selectedChild,
    setSelectedChild,
    setBranding,
  } = useBranding();
  const router = useRouter();

  const [confirmLogoutVisible, setConfirmLogoutVisible] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleSwitchRole(role: string) {
    setActiveRole(role as any);
    await persistActiveRole(role as any);
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await (await api()).auth.logout();
    } catch {
      /* revoke best-effort */
    } finally {
      await clearAuthSession({
        setAcl,
        setActiveRole,
        setSelectedChild,
        cacheContext: buildSessionCacheContext(acl, activeRole, selectedChild),
      });
      setConfirmLogoutVisible(false);
      setLoggingOut(false);
      router.replace("/role-select");
    }
  }

  async function handleSwitchSchool() {
    await clearTenantSelection({
      setBranding,
      setAcl,
      setActiveRole,
      setSelectedChild,
      cacheContext: buildSessionCacheContext(acl, activeRole, selectedChild),
    });
    router.replace("/school-select");
  }

  const roleName = activeRole ? activeRole.toUpperCase() : "MEMBER";

  return (
    <Screen scrollable={true}>
      <View className="px-6 pt-10 pb-8">
        {/* Header */}
        <ScreenHeader
          title="Profile & Settings"
          subtitle="Manage your session, roles, and school connection"
        />

        {/* User Identity Card */}
        <Card variant="elevated" style={{ marginBottom: 16 }}>
          <View className="flex-row items-center gap-x-4">
            <Avatar
              name={acl?.userId ?? "User"}
              role={activeRole ?? undefined}
              size="lg"
            />
            <View className="flex-1">
              <View className="flex-row items-center gap-x-2 mb-1">
                <AppText
                  variant="title"
                  style={{ fontSize: 18, fontWeight: "700", color: "#1E293B" }}
                >
                  {acl?.userId ?? "Authenticated User"}
                </AppText>
              </View>
              <View className="flex-row items-center gap-x-2">
                <Badge label={roleName} variant="info" />
                {selectedChild ? (
                  <Badge label={`Ward: ${selectedChild.fullName}`} variant="success" />
                ) : null}
              </View>
            </View>
          </View>
        </Card>

        {/* Multi-Role Switcher Card */}
        {acl && acl.roles.length > 1 ? (
          <View className="mb-4">
            <SectionHeader
              title="Active Role"
              actionLabel="Change in list"
              onAction={() => router.push("/role-select")}
            />
            <Card variant="default">
              <AppText variant="caption" style={{ color: "#64748B", marginBottom: 10 }}>
                You have access to multiple roles. Tap a role below to switch active context:
              </AppText>
              <View className="flex-row flex-wrap gap-2">
                {acl.roles.map((r) => {
                  const isActive = activeRole === r;
                  return (
                    <Pressable
                      key={r}
                      onPress={() => void handleSwitchRole(r)}
                      className="flex-row items-center px-3.5 py-2 rounded-xl border active:opacity-80"
                      style={{
                        backgroundColor: isActive ? theme.colors.primary : "#F8FAFC",
                        borderColor: isActive ? theme.colors.primary : "#CBD5E1",
                      }}
                    >
                      {isActive ? (
                        <Check size={14} color="white" style={{ marginRight: 6 }} />
                      ) : null}
                      <AppText
                        variant="caption"
                        style={{
                          fontWeight: "700",
                          color: isActive ? "white" : "#334155",
                          textTransform: "capitalize",
                        }}
                      >
                        {r}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </Card>
          </View>
        ) : null}

        {/* School Information Card */}
        <View className="mb-4">
          <SectionHeader title="Connected School" />
          <Card variant="default">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center gap-x-3">
                <View
                  className="w-10 h-10 rounded-xl items-center justify-center"
                  style={{ backgroundColor: `${theme.colors.primary}15` }}
                >
                  <School size={20} color={theme.colors.primary} />
                </View>
                <View>
                  <AppText variant="title" style={{ fontSize: 16, fontWeight: "700" }}>
                    {branding?.schoolName ?? "SchoolOS"}
                  </AppText>
                  <AppText variant="caption" style={{ color: "#64748B" }}>
                    Code: {branding?.slug ?? "arulneri"}
                  </AppText>
                </View>
              </View>
              <Badge label="Connected" variant="success" />
            </View>

            <Divider marginVertical={8} />

            <View className="flex-row justify-between py-1">
              <AppText variant="caption" style={{ color: "#64748B" }}>
                Academic Year
              </AppText>
              <AppText variant="caption" style={{ fontWeight: "600", color: "#1E293B" }}>
                2026-2027
              </AppText>
            </View>
            <View className="flex-row justify-between py-1">
              <AppText variant="caption" style={{ color: "#64748B" }}>
                Location
              </AppText>
              <AppText variant="caption" style={{ fontWeight: "600", color: "#1E293B" }}>
                {branding?.location ?? "Tamil Nadu"}
              </AppText>
            </View>
          </Card>
        </View>

        {/* Session Actions */}
        <View className="mt-2 gap-y-3">
          <AppButton
            label="Switch School"
            variant="outline"
            onPress={() => void handleSwitchSchool()}
            leftIcon={<Building size={18} color={theme.colors.primary} />}
          />

          <AppButton
            label="Sign Out"
            variant="danger"
            onPress={() => setConfirmLogoutVisible(true)}
            leftIcon={<LogOut size={18} color="#DC2626" />}
          />
        </View>

        {/* Logout Confirmation Modal */}
        <ModalSheet
          visible={confirmLogoutVisible}
          title="Sign Out Confirmation"
          onClose={() => setConfirmLogoutVisible(false)}
        >
          <View className="p-4">
            <AppText variant="body" style={{ color: "#475569", marginBottom: 20 }}>
              Are you sure you want to sign out? Your offline cache for this session will be preserved according to security policy.
            </AppText>

            <View className="gap-y-2.5">
              <AppButton
                label={loggingOut ? "Signing out…" : "Yes, Sign Out"}
                variant="danger"
                loading={loggingOut}
                onPress={() => void handleLogout()}
              />
              <AppButton
                label="Cancel"
                variant="outline"
                onPress={() => setConfirmLogoutVisible(false)}
              />
            </View>
          </View>
        </ModalSheet>
      </View>
    </Screen>
  );
}
