import React, { useMemo } from "react";
import { View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import {
  CalendarCheck,
  Clock,
  BookOpenCheck,
  Award,
  FileText,
  CreditCard,
  ChevronRight,
} from "lucide-react-native";
import { useBranding } from "../../features/branding/branding-provider";
import { resolveMobileHomeRole } from "../../features/home/home-policy";
import { getAcademicModulesForRole, type AcademicModuleId } from "../../features/home/role-modules";
import { Screen, Card, Badge, type BadgeVariant } from "../../components/ui";
import { AppText } from "../../components/ui/AppText";

interface AcademicModule {
  id: AcademicModuleId;
  title: string;
  subtitle: string;
  route: string;
  icon: typeof CalendarCheck;
  accent: string;
  badge?: string;
  badgeVariant?: BadgeVariant;
}

const CATALOG: Record<AcademicModuleId, AcademicModule> = {
  attendance: {
    id: "attendance",
    title: "Attendance",
    subtitle: "Daily register or child / own history",
    route: "/attendance",
    icon: CalendarCheck,
    accent: "#059669",
  },
  timetable: {
    id: "timetable",
    title: "Timetable",
    subtitle: "Week grid and today's periods",
    route: "/timetable",
    icon: Clock,
    accent: "#0284C7",
  },
  homework: {
    id: "homework",
    title: "Homework",
    subtitle: "Assign or track due work",
    route: "/homework",
    icon: BookOpenCheck,
    accent: "#7C3AED",
  },
  marks: {
    id: "marks",
    title: "Marks",
    subtitle: "Draft entry or published results",
    route: "/marks",
    icon: Award,
    accent: "#EA580C",
  },
  "report-card": {
    id: "report-card",
    title: "Report card",
    subtitle: "Published term card",
    route: "/report-card",
    icon: FileText,
    accent: "#2563EB",
    badge: "Official",
    badgeVariant: "info",
  },
  fees: {
    id: "fees",
    title: "Fees & receipts",
    subtitle: "Dues and official receipts",
    route: "/fees",
    icon: CreditCard,
    accent: "#0D9488",
  },
};

export default function Academics() {
  const { theme, acl, activeRole, selectedChild } = useBranding();
  const router = useRouter();
  const currentRole = resolveMobileHomeRole(activeRole, acl?.roles);
  const allowed = getAcademicModulesForRole(currentRole);
  const modules = useMemo(() => allowed.map((id) => CATALOG[id]), [allowed]);

  const blurb =
    currentRole === "teacher"
      ? "Instruction tools for your assigned section only."
      : currentRole === "parent"
        ? "Progress, schedule, and fees for the selected child."
        : currentRole === "student"
          ? "Your classes, homework, and published results."
          : "Academic operations.";

  return (
    <Screen scrollable={true}>
      <View className="px-6 pt-10 pb-8">
        <View className="mb-6">
          <View className="flex-row items-center gap-x-2 mb-1">
            <Badge label={currentRole ? currentRole.toUpperCase() : "ACADEMICS"} variant="neutral" />
            {currentRole === "parent" && selectedChild ? (
              <Badge label={selectedChild.fullName} variant="info" />
            ) : null}
          </View>
          <AppText variant="display" color={theme.colors.primary} style={{ fontSize: 28, fontWeight: "800" }}>
            Academics Hub
          </AppText>
          <AppText variant="body" style={{ marginTop: 4, color: theme.colors.inkMuted ?? "#475569", fontSize: 15 }}>
            {blurb}
          </AppText>
        </View>

        <View className="gap-y-3.5">
          {modules.map((mod) => {
            const IconComponent = mod.icon;
            return (
              <Pressable key={mod.id} onPress={() => router.push(mod.route as never)} className="active:opacity-80">
                <Card variant="default">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-x-3.5 flex-1 pr-3">
                      <View
                        className="w-12 h-12 rounded-2xl items-center justify-center"
                        style={{ backgroundColor: `${mod.accent}16` }}
                      >
                        <IconComponent size={24} color={mod.accent} />
                      </View>
                      <View className="flex-1">
                        <View className="flex-row items-center gap-x-2 mb-1">
                          <AppText variant="title" style={{ fontSize: 16, fontWeight: "700", color: theme.colors.ink }}>
                            {mod.title}
                          </AppText>
                          {mod.badge ? <Badge label={mod.badge} variant={mod.badgeVariant ?? "neutral"} /> : null}
                        </View>
                        <AppText variant="caption" style={{ color: theme.colors.inkMuted ?? "#64748B", fontSize: 13 }} numberOfLines={2}>
                          {mod.subtitle}
                        </AppText>
                      </View>
                    </View>
                    <ChevronRight size={20} color={theme.colors.borderStrong ?? "#94A3B8"} />
                  </View>
                </Card>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Screen>
  );
}
