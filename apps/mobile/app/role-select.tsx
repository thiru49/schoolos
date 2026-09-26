import React from "react";
import { Image, View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { GraduationCap, Users, Briefcase, ChevronRight, Check } from "lucide-react-native";
import type { RoleCode } from "@schoolos/types";
import { useBranding } from "../features/branding/branding-provider";
import { setActiveRole as persistActiveRole } from "../services/storage";
import { Screen, Card, Badge } from "../components/ui";
import { AppText } from "../components/ui/AppText";

const FOOTER_CREDIT = "Developed by SchoolOS Team";

interface RoleOption {
  id: RoleCode;
  label: string;
  ta: string;
  description: string;
  icon: typeof GraduationCap;
  accent: string;
}

/** Mobile entry roles only — Admin stays on web. */
const ROLES: RoleOption[] = [
  {
    id: "student",
    label: "Student",
    ta: "மாணவர்",
    description: "View timetable, daily homework, attendance, and exam scores",
    icon: GraduationCap,
    accent: "#0284C7",
  },
  {
    id: "parent",
    label: "Parent",
    ta: "பெற்றோர்",
    description: "Monitor child attendance, homework, exams, fees, and circulars",
    icon: Users,
    accent: "#059669",
  },
  {
    id: "teacher",
    label: "Teacher",
    ta: "ஆசிரியர்",
    description: "Mark attendance, create homework, submit marks, and view roster",
    icon: Briefcase,
    accent: "#4F46E5",
  },
];

export default function RoleSelect() {
  const router = useRouter();
  const { branding, theme, acl, activeRole, setActiveRole } = useBranding();

  const isAuthenticated = Boolean(acl && acl.roles.length > 0);
  const availableRoles = isAuthenticated
    ? ROLES.filter((r) => acl?.roles.includes(r.id))
    : ROLES;

  const primary = theme.colors.primary || "#0B3A6E";
  const schoolName = branding?.schoolName ?? "SchoolOS";
  const initials = schoolName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

  async function selectRole(roleId: RoleCode) {
    if (isAuthenticated) {
      setActiveRole(roleId);
      await persistActiveRole(roleId);
      router.replace("/(tabs)/home");
    } else {
      router.push({ pathname: "/login", params: { role: roleId } });
    }
  }

  return (
    <Screen scrollable={true}>
      <View className="flex-1 px-6 pt-8 pb-8">
        {/* Brand header — logo + school from tenant branding */}
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
            {branding?.location ? (
              <AppText
                variant="caption"
                style={{ color: "#94A3B8", marginTop: 2, fontSize: 12 }}
                numberOfLines={1}
              >
                {branding.location.replace(/ · /g, ", ")}
              </AppText>
            ) : null}
          </View>
        </View>

        <View className="mb-5">
          <AppText
            variant="display"
            color={primary}
            style={{ fontSize: 28, fontWeight: "800" }}
          >
            {isAuthenticated ? "Switch Active Role" : "Select Your Role"}
          </AppText>
          <AppText
            variant="body"
            style={{ marginTop: 6, color: "#64748B", fontSize: 15 }}
          >
            {isAuthenticated
              ? "Select the role context you want to manage right now."
              : "Choose how you want to sign in to access your dashboard."}
          </AppText>
        </View>

        <View className="gap-y-3.5">
          {availableRoles.map((r) => {
            const IconComponent = r.icon;
            const isCurrentActive = isAuthenticated && activeRole === r.id;

            return (
              <Pressable
                key={r.id}
                onPress={() => void selectRole(r.id)}
                className="active:opacity-80"
              >
                <Card
                  variant={isCurrentActive ? "elevated" : "default"}
                  style={{
                    borderColor: isCurrentActive ? r.accent : "#E2E8F0",
                    borderWidth: isCurrentActive ? 2 : 1,
                  }}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-x-3.5 flex-1 pr-2">
                      <View
                        className="h-12 w-12 items-center justify-center rounded-2xl"
                        style={{ backgroundColor: `${r.accent}16` }}
                      >
                        <IconComponent size={24} color={r.accent} />
                      </View>

                      <View className="flex-1">
                        <View className="flex-row flex-wrap items-center gap-x-2">
                          <AppText
                            variant="title"
                            style={{ fontSize: 17, fontWeight: "700", color: "#1E293B" }}
                          >
                            {r.label}
                          </AppText>
                          <AppText variant="caption" style={{ color: "#64748B", fontSize: 13 }}>
                            ({r.ta})
                          </AppText>
                          {isCurrentActive ? (
                            <Badge label="Active" variant="success" />
                          ) : null}
                        </View>
                        <AppText
                          variant="caption"
                          style={{ color: "#64748B", marginTop: 2, fontSize: 13 }}
                          numberOfLines={2}
                        >
                          {r.description}
                        </AppText>
                      </View>
                    </View>

                    {isCurrentActive ? (
                      <View
                        className="h-8 w-8 items-center justify-center rounded-full"
                        style={{ backgroundColor: r.accent }}
                      >
                        <Check size={16} color="white" />
                      </View>
                    ) : (
                      <ChevronRight size={20} color="#94A3B8" />
                    )}
                  </View>
                </Card>
              </Pressable>
            );
          })}
        </View>

        <View className="mt-10 items-center">
          <AppText
            variant="caption"
            style={{ color: "#94A3B8", fontSize: 12, textAlign: "center" }}
          >
            {branding?.poweredBy?.trim() || FOOTER_CREDIT}
          </AppText>
        </View>
      </View>
    </Screen>
  );
}
